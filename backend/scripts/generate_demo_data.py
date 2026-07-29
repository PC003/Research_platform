"""Generate realistic demo data using Faker and insert into PostgreSQL.

Generates 500 students and 3000 research papers with realistic
university data matching VIT-style departments and schools.

Usage:
    cd backend
    python -m scripts.generate_demo_data

The script is idempotent — safe to run multiple times (uses UPSERT).
"""

import asyncio
import random
import sys
from datetime import date, timedelta
from pathlib import Path

from faker import Faker
from tqdm import tqdm

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.config import settings
from app.models.base import Base
from app.models.paper_orm import PaperORM
from app.models.student import Student

# Import ORM models so metadata is populated
import app.models.paper_embedding  # noqa: F401

fake = Faker(["en_IN", "en_US"])
Faker.seed(42)
random.seed(42)

# ── Constants ─────────────────────────────────────────────────────────────────

NUM_STUDENTS = 500
NUM_PAPERS = 3000
BATCH_SIZE = 100

DEPARTMENTS = [
    "Computer Science and Engineering",
    "Artificial Intelligence and Machine Learning",
    "Data Science",
    "Mechanical Engineering",
    "Civil Engineering",
    "Biotechnology",
    "Electrical and Electronics Engineering",
    "Electronics and Communication Engineering",
    "Chemical Engineering",
    "Business Administration",
]

SCHOOLS = {
    "Computer Science and Engineering": "School of Computer Science Engineering and Information Systems (SCORE)",
    "Artificial Intelligence and Machine Learning": "School of Computer Science Engineering and Information Systems (SCORE)",
    "Data Science": "School of Computer Science Engineering and Information Systems (SCORE)",
    "Mechanical Engineering": "School of Mechanical Engineering (SMEC)",
    "Civil Engineering": "School of Civil Engineering (SCSE)",
    "Biotechnology": "School of Biosciences and Technology (SBST)",
    "Electrical and Electronics Engineering": "School of Electrical Engineering (SELECT)",
    "Electronics and Communication Engineering": "School of Electronics Engineering (SENSE)",
    "Chemical Engineering": "School of Chemical Engineering (SchE)",
    "Business Administration": "VIT Business School (VIT-BS)",
}

DEPT_CODES = {
    "Computer Science and Engineering": "BCE",
    "Artificial Intelligence and Machine Learning": "BAI",
    "Data Science": "BDS",
    "Mechanical Engineering": "BME",
    "Civil Engineering": "BCI",
    "Biotechnology": "BBT",
    "Electrical and Electronics Engineering": "BEE",
    "Electronics and Communication Engineering": "BEC",
    "Chemical Engineering": "BCH",
    "Business Administration": "BBA",
}

BATCHES = ["2020-2024", "2021-2025", "2022-2026", "2023-2027", "2024-2028"]

# ── Paper title templates by department ───────────────────────────────────────

TITLE_TEMPLATES = {
    "Computer Science and Engineering": [
        "A Novel {adj} Approach to {topic} Using {method}",
        "{method}-Based Framework for {topic} in {domain}",
        "Optimizing {topic} Through {adj} {method} Techniques",
        "Scalable {method} Architecture for {topic}",
        "Towards Efficient {topic}: A {adj} {method} Study",
        "Deep Learning for {topic} in {domain} Applications",
        "{adj} Algorithm for Real-Time {topic}",
    ],
    "Artificial Intelligence and Machine Learning": [
        "Attention-Based {method} for {topic} in {domain}",
        "A {adj} Neural Network for {topic}",
        "Reinforcement Learning Approach to {topic} Using {method}",
        "Transfer Learning for {adj} {topic}",
        "Federated {method} for Privacy-Preserving {topic}",
        "Explainable AI for {topic}: A {method} Framework",
        "Generative {method} for {adj} {topic}",
    ],
    "Data Science": [
        "Predictive Analytics for {topic} Using {method}",
        "A {adj} Data Pipeline for {topic}",
        "Big Data {method} for {topic} in {domain}",
        "Statistical {method} for {adj} {topic} Analysis",
        "Real-Time {topic} Monitoring with {method}",
        "Feature Engineering for {adj} {topic} Prediction",
    ],
    "Mechanical Engineering": [
        "{adj} Finite Element Analysis of {topic}",
        "Design and Optimization of {topic} Using {method}",
        "Thermal Analysis of {adj} {topic} Systems",
        "Computational Fluid Dynamics Study of {topic}",
        "{method}-Based Approach to {topic} in {domain}",
        "Vibration Analysis of {adj} {topic} Structures",
    ],
    "Civil Engineering": [
        "Structural Analysis of {adj} {topic} Using {method}",
        "Seismic Performance of {topic} with {method}",
        "Sustainable {topic}: A {adj} {method} Approach",
        "Geotechnical Investigation of {topic} in {domain}",
        "{adj} Concrete Mix Design for {topic}",
        "Environmental Impact Assessment of {topic}",
    ],
    "Biotechnology": [
        "{adj} Biosensor for {topic} Detection",
        "CRISPR-{method} Approach to {topic}",
        "Protein Engineering for {adj} {topic}",
        "Computational Drug Discovery for {topic} Using {method}",
        "Metabolic Engineering of {topic} in {domain}",
        "Genomic Analysis of {adj} {topic} Pathways",
    ],
    "Electrical and Electronics Engineering": [
        "{adj} Power Converter Design for {topic}",
        "Smart Grid {method} for {topic} Management",
        "IoT-Based {adj} {topic} Monitoring System",
        "{method} Control Strategy for {topic}",
        "Renewable Energy {method} for {adj} {topic}",
        "FPGA Implementation of {adj} {topic} {method}",
    ],
    "Electronics and Communication Engineering": [
        "{adj} Antenna Design for {topic} Applications",
        "5G {method} for {topic} in {domain}",
        "VLSI Design of {adj} {topic} Processor",
        "Signal Processing {method} for {topic}",
        "{adj} Wireless {method} for {topic}",
        "Embedded System for {adj} {topic} Control",
    ],
    "Chemical Engineering": [
        "Catalytic {method} for {adj} {topic} Synthesis",
        "Process Optimization of {topic} Using {method}",
        "{adj} Membrane Technology for {topic} Separation",
        "Reaction Kinetics of {topic} in {domain}",
        "Green Chemistry Approach to {adj} {topic}",
        "Nanoparticle {method} for {topic} Applications",
    ],
    "Business Administration": [
        "Impact of {topic} on {domain}: A {adj} Analysis",
        "{adj} Business Model for {topic} in {domain}",
        "Digital Transformation of {topic} Using {method}",
        "Consumer Behavior Analysis for {topic}",
        "Strategic {method} for {adj} {topic} Management",
        "Supply Chain {method} for {topic} Optimization",
    ],
}

TOPIC_WORDS = {
    "Computer Science and Engineering": [
        "network intrusion detection", "cloud resource allocation",
        "code vulnerability detection", "distributed systems",
        "microservice architecture", "API performance optimization",
        "containerized applications", "parallel computing",
        "edge computing workloads", "software defect prediction",
    ],
    "Artificial Intelligence and Machine Learning": [
        "image classification", "natural language understanding",
        "sentiment analysis", "object detection",
        "anomaly detection", "time series forecasting",
        "medical image segmentation", "speech recognition",
        "text summarization", "autonomous navigation",
    ],
    "Data Science": [
        "customer churn prediction", "fraud detection",
        "recommendation systems", "social network analysis",
        "health outcome prediction", "urban mobility patterns",
        "climate data analysis", "stock price forecasting",
        "user engagement metrics", "energy consumption patterns",
    ],
    "Mechanical Engineering": [
        "turbine blade", "heat exchanger",
        "composite material", "robotic arm",
        "engine component", "suspension system",
        "wind turbine", "hydraulic actuator",
        "gear transmission", "additive manufacturing",
    ],
    "Civil Engineering": [
        "high-rise building", "bridge deck",
        "highway pavement", "retaining wall",
        "water treatment plant", "dam structure",
        "underground tunnel", "foundation system",
        "green building", "stormwater management",
    ],
    "Biotechnology": [
        "cancer biomarker", "antimicrobial peptide",
        "enzyme activity", "viral pathogen",
        "plant secondary metabolite", "biofuel production",
        "gene expression", "drug resistance",
        "vaccine candidate", "stem cell differentiation",
    ],
    "Electrical and Electronics Engineering": [
        "solar inverter", "battery management",
        "motor drive", "power quality",
        "electric vehicle charging", "microgrid",
        "transformer efficiency", "voltage regulation",
        "energy storage", "fault detection",
    ],
    "Electronics and Communication Engineering": [
        "MIMO system", "radar signal",
        "optical fiber", "spectrum allocation",
        "beamforming", "cognitive radio",
        "satellite communication", "RF filter",
        "image sensor", "wearable device",
    ],
    "Chemical Engineering": [
        "wastewater treatment", "polymer degradation",
        "fuel cell membrane", "catalyst support",
        "CO2 capture", "pharmaceutical formulation",
        "biodiesel production", "corrosion inhibitor",
        "nanocomposite", "ion exchange",
    ],
    "Business Administration": [
        "digital marketing", "corporate governance",
        "startup ecosystem", "fintech adoption",
        "workplace productivity", "brand perception",
        "e-commerce logistics", "ESG investing",
        "remote work culture", "talent management",
    ],
}

METHOD_WORDS = [
    "Deep Learning", "Machine Learning", "Genetic Algorithm",
    "Optimization", "Simulation", "Regression",
    "Clustering", "Classification", "Transformer",
    "CNN", "GAN", "Random Forest", "XGBoost",
    "Graph Neural Network", "Bayesian", "Monte Carlo",
    "Fuzzy Logic", "Neural Architecture Search",
    "Ensemble", "Hybrid", "Multi-Objective",
]

ADJ_WORDS = [
    "Novel", "Robust", "Efficient", "Adaptive",
    "Intelligent", "Hybrid", "Multi-Scale", "Enhanced",
    "Lightweight", "High-Performance", "Low-Latency",
    "Scalable", "Distributed", "Sustainable",
    "Automated", "Context-Aware", "Energy-Efficient",
]

DOMAIN_WORDS = [
    "Healthcare", "Manufacturing", "Agriculture",
    "Transportation", "Smart Cities", "Education",
    "Cyber-Physical Systems", "IoT Networks",
    "Financial Systems", "Environmental Monitoring",
]

JOURNALS = [
    "IEEE Transactions on Neural Networks and Learning Systems",
    "IEEE Transactions on Intelligent Transportation Systems",
    "Nature Communications",
    "Nature Biotechnology",
    "Scientific Reports",
    "Journal of Cleaner Production",
    "Applied Energy",
    "Computers in Industry",
    "Expert Systems with Applications",
    "Knowledge-Based Systems",
    "Neurocomputing",
    "Pattern Recognition",
    "Information Sciences",
    "Sensors",
    "Materials Today",
    "Chemical Engineering Journal",
    "Bioresource Technology",
    "Journal of Materials Science",
    "Renewable Energy",
    "Energy Conversion and Management",
    "Structural Engineering and Mechanics",
    "Journal of Building Engineering",
    "Automation in Construction",
    "International Journal of Production Research",
    "Journal of Business Research",
    "Technological Forecasting and Social Change",
    "Computers and Industrial Engineering",
    "IEEE Access",
    "PLOS ONE",
    "Frontiers in Bioengineering and Biotechnology",
]

CONFERENCES = [
    "IEEE International Conference on Computer Vision (ICCV)",
    "International Conference on Machine Learning (ICML)",
    "Neural Information Processing Systems (NeurIPS)",
    "AAAI Conference on Artificial Intelligence",
    "ACM SIGKDD Conference on Knowledge Discovery and Data Mining",
    "IEEE Conference on Computer Vision and Pattern Recognition (CVPR)",
    "International Conference on Learning Representations (ICLR)",
    "ACM Conference on Information and Knowledge Management (CIKM)",
    "IEEE International Conference on Data Engineering (ICDE)",
    "International Conference on Very Large Databases (VLDB)",
    "IEEE International Conference on Robotics and Automation (ICRA)",
    "International Conference on Acoustics, Speech and Signal Processing (ICASSP)",
    "ACM SIGMOD International Conference on Management of Data",
    "European Conference on Computer Vision (ECCV)",
    "International Joint Conference on Artificial Intelligence (IJCAI)",
]

COLLABORATION_TYPES = ["Individual", "National", "International"]
PAPER_TYPES = ["Journal", "Conference", "Patent", "Book Chapter"]
PAPER_TYPE_WEIGHTS = [60, 25, 10, 5]  # percentage weights

KEYWORD_POOLS = {
    "Computer Science and Engineering": [
        "distributed systems", "cloud computing", "microservices",
        "containerization", "DevOps", "API gateway", "load balancing",
        "software testing", "code review", "cybersecurity",
        "blockchain", "edge computing", "serverless",
        "parallel processing", "operating systems",
    ],
    "Artificial Intelligence and Machine Learning": [
        "deep learning", "neural network", "transfer learning",
        "attention mechanism", "transformer", "BERT", "GPT",
        "computer vision", "NLP", "reinforcement learning",
        "federated learning", "GAN", "autoencoder",
        "feature extraction", "model compression",
    ],
    "Data Science": [
        "data mining", "big data", "predictive modeling",
        "time series", "clustering", "classification",
        "feature engineering", "data visualization",
        "statistical analysis", "ETL pipeline",
        "data warehouse", "streaming analytics",
        "anomaly detection", "dimensionality reduction",
    ],
    "Mechanical Engineering": [
        "finite element analysis", "CFD", "CAD",
        "3D printing", "thermal management", "vibration",
        "fatigue analysis", "material science", "robotics",
        "mechatronics", "composite materials", "tribology",
        "manufacturing process", "quality control",
    ],
    "Civil Engineering": [
        "structural analysis", "concrete technology",
        "geotechnical engineering", "earthquake engineering",
        "transportation planning", "water resources",
        "environmental engineering", "construction management",
        "BIM", "sustainable design", "soil mechanics",
        "steel structures", "foundation engineering",
    ],
    "Biotechnology": [
        "CRISPR", "gene editing", "PCR", "bioinformatics",
        "protein folding", "drug delivery", "biosensor",
        "genomics", "proteomics", "metabolomics",
        "fermentation", "cell culture", "immunology",
        "molecular biology", "bioprocessing",
    ],
    "Electrical and Electronics Engineering": [
        "power electronics", "smart grid", "renewable energy",
        "electric vehicle", "battery technology", "IoT",
        "embedded systems", "SCADA", "PLC",
        "power systems", "control systems", "HVDC",
        "energy storage", "solar energy",
    ],
    "Electronics and Communication Engineering": [
        "5G", "MIMO", "antenna design", "signal processing",
        "VLSI", "FPGA", "wireless communication",
        "optical communication", "radar", "spectrum",
        "beamforming", "modulation", "RF design",
        "image processing", "sensor networks",
    ],
    "Chemical Engineering": [
        "catalysis", "reaction engineering", "separation process",
        "polymer science", "nanomaterials", "green chemistry",
        "process control", "thermodynamics", "fluid mechanics",
        "membrane technology", "corrosion science",
        "petrochemicals", "process simulation",
    ],
    "Business Administration": [
        "strategic management", "marketing analytics",
        "financial modeling", "supply chain", "entrepreneurship",
        "digital transformation", "organizational behavior",
        "human resources", "corporate social responsibility",
        "e-commerce", "business intelligence",
        "risk management", "operations research",
    ],
}


# ── Generators ────────────────────────────────────────────────────────────────


def generate_student_id(batch: str, dept_code: str, index: int) -> str:
    """Generate a student ID like 24BCE1234."""
    year_prefix = batch[:2]  # e.g., "20" from "2020-2024"
    number = 1000 + index
    return f"{year_prefix}{dept_code}{number}"


def generate_students(count: int = NUM_STUDENTS) -> list[dict]:
    """Generate realistic student records."""
    students = []
    per_dept = count // len(DEPARTMENTS)
    extra = count % len(DEPARTMENTS)

    idx = 0
    for dept_idx, dept in enumerate(DEPARTMENTS):
        dept_count = per_dept + (1 if dept_idx < extra else 0)
        dept_code = DEPT_CODES[dept]
        school = SCHOOLS[dept]
        batch = random.choice(BATCHES)

        for i in range(dept_count):
            idx += 1
            name = fake.name()
            student_id = generate_student_id(batch, dept_code, idx)
            email = f"{name.lower().replace(' ', '.').replace('..', '.')}@vitstudent.ac.in"

            students.append({
                "student_id": student_id,
                "student_name": name,
                "email": email[:150],
                "department": dept,
                "school": school,
                "batch": batch,
                "profile_photo": f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=random&size=200",
                "linkedin_url": f"https://linkedin.com/in/{name.lower().replace(' ', '-')}-{random.randint(100, 999)}",
                "github_url": f"https://github.com/{name.lower().replace(' ', '')}{random.randint(1, 99)}",
            })

    random.shuffle(students)
    return students


def generate_title(dept: str) -> str:
    """Generate a realistic paper title for a department."""
    templates = TITLE_TEMPLATES.get(dept, TITLE_TEMPLATES["Computer Science and Engineering"])
    template = random.choice(templates)
    return template.format(
        adj=random.choice(ADJ_WORDS),
        topic=random.choice(TOPIC_WORDS.get(dept, TOPIC_WORDS["Computer Science and Engineering"])),
        method=random.choice(METHOD_WORDS),
        domain=random.choice(DOMAIN_WORDS),
    )


def generate_abstract(dept: str, title: str) -> str:
    """Generate a realistic abstract (150-300 words)."""
    keywords = KEYWORD_POOLS.get(dept, KEYWORD_POOLS["Computer Science and Engineering"])
    selected_kw = random.sample(keywords, min(4, len(keywords)))

    intro_templates = [
        f"This paper presents a comprehensive study on {title.lower()}.",
        f"In this work, we investigate {title.lower()} and propose a novel framework.",
        f"The rapid advancement in {random.choice(selected_kw)} has created new opportunities for research.",
        f"Recent developments in {random.choice(selected_kw)} have highlighted the need for {title.lower()}.",
    ]

    method_templates = [
        f"Our approach leverages {random.choice(selected_kw)} combined with {random.choice(selected_kw)} to achieve superior performance.",
        f"We employ a combination of {random.choice(selected_kw)} and advanced {random.choice(selected_kw)} techniques.",
        f"The proposed methodology integrates {random.choice(selected_kw)} with state-of-the-art {random.choice(selected_kw)} methods.",
    ]

    result_templates = [
        f"Experimental results demonstrate that our approach outperforms existing baselines by {random.randint(5, 25)}% on standard benchmarks.",
        f"Our findings indicate significant improvements in accuracy, achieving {random.uniform(85, 99):.1f}% on the evaluation dataset.",
        f"The results show a {random.randint(10, 40)}% reduction in computational cost while maintaining comparable accuracy.",
    ]

    conclusion_templates = [
        f"These findings contribute to the growing body of research in {random.choice(selected_kw)} and open new avenues for future investigation.",
        f"Our work provides practical insights for researchers and practitioners working in {random.choice(selected_kw)}.",
        f"The proposed framework can be extended to other domains including {random.choice(DOMAIN_WORDS).lower()} and {random.choice(DOMAIN_WORDS).lower()}.",
    ]

    # Build abstract from template sections + filler
    paragraphs = [
        random.choice(intro_templates),
        fake.paragraph(nb_sentences=random.randint(2, 4)),
        random.choice(method_templates),
        fake.paragraph(nb_sentences=random.randint(2, 3)),
        random.choice(result_templates),
        random.choice(conclusion_templates),
    ]

    abstract = " ".join(paragraphs)

    # Trim to ~150-300 words
    words = abstract.split()
    if len(words) > 300:
        words = words[:300]
    elif len(words) < 150:
        words.extend(fake.paragraph(nb_sentences=3).split())
        words = words[:random.randint(150, 250)]

    return " ".join(words)


def generate_keywords(dept: str, count: int = None) -> list[str]:
    """Generate 5-8 relevant keywords."""
    if count is None:
        count = random.randint(5, 8)
    pool = KEYWORD_POOLS.get(dept, KEYWORD_POOLS["Computer Science and Engineering"])
    return random.sample(pool, min(count, len(pool)))


def generate_doi() -> str:
    """Generate a realistic DOI number."""
    prefix = random.choice(["10.1109", "10.1016", "10.1038", "10.1145", "10.1007", "10.3390"])
    suffix = f"{fake.lexify('??????')}.{fake.year()}.{random.randint(1000000, 9999999)}"
    return f"{prefix}/{suffix}"


def generate_papers(students: list[dict], count: int = NUM_PAPERS) -> list[dict]:
    """Generate realistic research papers linked to students."""
    papers = []

    # Distribute papers: some students get many, most get a few
    student_paper_counts = []
    remaining = count

    for i, student in enumerate(students):
        if i < len(students) - 1:
            # Weighted random: most get 4-8, some get up to 12
            if random.random() < 0.15:
                c = random.randint(8, 12)
            elif random.random() < 0.5:
                c = random.randint(4, 7)
            else:
                c = random.randint(2, 5)
            c = min(c, remaining)
        else:
            c = remaining
        student_paper_counts.append(c)
        remaining -= c
        if remaining <= 0:
            break

    paper_idx = 0
    for student_idx, paper_count in enumerate(student_paper_counts):
        student = students[student_idx]
        dept = student["department"]

        for _ in range(paper_count):
            paper_idx += 1
            title = generate_title(dept)

            # Ensure unique titles
            while any(p["paper_title"] == title for p in papers):
                title = generate_title(dept)

            # Paper type
            paper_type = random.choices(PAPER_TYPES, weights=PAPER_TYPE_WEIGHTS, k=1)[0]

            # Publication date
            start_date = date(2020, 1, 1)
            end_date = date(2026, 6, 30)
            pub_date = start_date + timedelta(
                days=random.randint(0, (end_date - start_date).days)
            )

            # Authors (1-6, including student name)
            num_coauthors = random.randint(0, 5)
            authors = [student["student_name"]]
            for _ in range(num_coauthors):
                authors.append(fake.name())

            # Journal or conference
            journal_name = ""
            conference_name = ""
            if paper_type in ("Journal", "Patent", "Book Chapter"):
                journal_name = random.choice(JOURNALS)
            elif paper_type == "Conference":
                conference_name = random.choice(CONFERENCES)
                # Some conference papers also have a journal
                if random.random() < 0.3:
                    journal_name = random.choice(JOURNALS)

            # Citation count (weighted toward lower values)
            citation_count = int(random.paretovariate(1.5)) + random.randint(0, 10)
            citation_count = min(citation_count, 500)

            # Impact factor
            impact_factor = round(random.uniform(0.5, 15.0), 2)

            papers.append({
                "paper_title": title,
                "authors": authors,
                "abstract": generate_abstract(dept, title),
                "keywords": generate_keywords(dept),
                "department": dept,
                "school": student["school"],
                "publication_date": pub_date,
                "publication_year": pub_date.year,
                "journal_name": journal_name,
                "conference_name": conference_name,
                "paper_type": paper_type,
                "doi": generate_doi(),
                "paper_link": f"https://doi.org/{generate_doi()}",
                "pdf_url": f"https://example.com/papers/{paper_idx}.pdf",
                "photo_url": f"https://picsum.photos/seed/{paper_idx}/400/300",
                "citation_count": citation_count,
                "impact_factor": impact_factor,
                "collaboration_type": random.choices(
                    COLLABORATION_TYPES,
                    weights=[40, 35, 25],
                    k=1,
                )[0],
                "status": "Published",
                "student_id": student["student_id"],
            })

    return papers


# ── Database insertion ────────────────────────────────────────────────────────


async def insert_students(session: AsyncSession, students: list[dict]) -> int:
    """Insert students with UPSERT (skip on conflict)."""
    inserted = 0

    for i in tqdm(range(0, len(students), BATCH_SIZE), desc="Inserting students"):
        batch = students[i : i + BATCH_SIZE]
        stmt = pg_insert(Student).values(batch)
        stmt = stmt.on_conflict_do_nothing(index_elements=["student_id"])
        result = await session.execute(stmt)
        inserted += result.rowcount
        await session.flush()

    await session.commit()
    return inserted


async def insert_papers(session: AsyncSession, papers: list[dict]) -> int:
    """Insert papers in batches. Skip duplicates by title."""
    inserted = 0

    for i in tqdm(range(0, len(papers), BATCH_SIZE), desc="Inserting papers"):
        batch = papers[i : i + BATCH_SIZE]

        for paper_data in batch:
            # Check for duplicate by title
            existing = await session.execute(
                select(PaperORM.id)
                .where(PaperORM.paper_title == paper_data["paper_title"])
                .limit(1)
            )
            if existing.scalar_one_or_none() is not None:
                continue

            paper = PaperORM(**paper_data)
            session.add(paper)
            inserted += 1

        await session.flush()

    await session.commit()
    return inserted


# ── Main ──────────────────────────────────────────────────────────────────────


async def main() -> None:
    """Generate demo data and insert into PostgreSQL."""

    print("🎲 Generating demo data...")
    print()

    # Generate data
    students = generate_students(NUM_STUDENTS)
    print(f"   👨‍🎓 Generated {len(students)} students")

    papers = generate_papers(students, NUM_PAPERS)
    print(f"   📄 Generated {len(papers)} papers")
    print()

    # Connect to database
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False,
    )

    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables verified.")

    # Insert data
    async with session_factory() as session:
        print()
        student_count = await insert_students(session, students)
        paper_count = await insert_papers(session, papers)

    # Summary
    print()
    print("─" * 50)
    print(f"   👨‍🎓 Students inserted : {student_count}")
    print(f"   📄 Papers inserted   : {paper_count}")
    print("─" * 50)
    print()
    print("✅ Demo data generation complete!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
