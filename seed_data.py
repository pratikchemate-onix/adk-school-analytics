#!/usr/bin/env python3
"""
Synthetic Data Generator for School Academic Analytics System.
Generates realistic student data with deliberate anomaly injection for testing analytics queries.
"""

import os
import random
from datetime import date, timedelta

import psycopg2
from dotenv import load_dotenv
from faker import Faker

load_dotenv()

fake = Faker()
Faker.seed(42)
random.seed(42)

NUM_STUDENTS = 50
NUM_TERMS = 2
EXAM_TYPES = ["Midterm", "Final", "Quiz"]
SUBJECTS = ["Mathematics", "Science", "English", "History", "Geography", "Art"]
MEDICAL_ACCOMMODATION_RATIO = 0.2
MATH_SPIKE_STUDENTS = 5
ATTENDANCE_THRESHOLD_STUDENTS = 5


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "school_analytics"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
        port=os.getenv("DB_PORT", "5432"),
    )


def seed_subjects(cursor):
    for subject in SUBJECTS:
        cursor.execute(
            "INSERT INTO subjects (subject_name) VALUES (%s) ON CONFLICT DO NOTHING",
            (subject,),
        )
    print(f"Seeded {len(SUBJECTS)} subjects")


def seed_students(cursor):
    student_ids = []
    medical_accommodation_count = int(NUM_STUDENTS * MEDICAL_ACCOMMODATION_RATIO)

    for i in range(NUM_STUDENTS):
        first_name = fake.first_name()
        last_name = fake.last_name()
        grade_level = random.randint(6, 12)
        has_medical = i < medical_accommodation_count

        cursor.execute(
            """INSERT INTO students (first_name, last_name, grade_level, has_medical_accommodation)
               VALUES (%s, %s, %s, %s) RETURNING student_id""",
            (first_name, last_name, grade_level, has_medical),
        )
        student_ids.append(cursor.fetchone()[0])

    print(
        f"Seeded {NUM_STUDENTS} students ({medical_accommodation_count} with medical accommodation)"
    )
    return student_ids


def seed_marks(cursor, student_ids, subject_ids):
    math_spike_ids = random.sample(
        student_ids, min(MATH_SPIKE_STUDENTS, len(student_ids))
    )
    normal_ids = [s for s in student_ids if s not in math_spike_ids]
    terms = [f"Term {i}" for i in range(1, NUM_TERMS + 1)]
    total_marks = 0

    for student_id in normal_ids:
        for subject_id, _ in subject_ids:
            for term in terms:
                for exam_type in EXAM_TYPES:
                    max_score = 100.0
                    score = round(random.uniform(45.0, 95.0), 2)
                    cursor.execute(
                        """INSERT INTO marks (student_id, subject_id, exam_type, score, max_score, term)
                           VALUES (%s, %s, %s, %s, %s, %s)""",
                        (student_id, subject_id, exam_type, score, max_score, term),
                    )
                    total_marks += 1

    math_subject_id = next(s[0] for s in subject_ids if s[1] == "Mathematics")
    other_subject_ids = [s for s in subject_ids if s[1] != "Mathematics"]

    for student_id in math_spike_ids:
        for term in terms:
            for exam_type in EXAM_TYPES:
                cursor.execute(
                    """INSERT INTO marks (student_id, subject_id, exam_type, score, max_score, term)
                       VALUES (%s, %s, %s, %s, %s, %s)""",
                    (
                        student_id,
                        math_subject_id,
                        exam_type,
                        round(random.uniform(85.0, 98.0), 2),
                        100.0,
                        term,
                    ),
                )
                total_marks += 1

            for subject_id, _ in other_subject_ids:
                for exam_type in EXAM_TYPES:
                    cursor.execute(
                        """INSERT INTO marks (student_id, subject_id, exam_type, score, max_score, term)
                           VALUES (%s, %s, %s, %s, %s, %s)""",
                        (
                            student_id,
                            subject_id,
                            exam_type,
                            round(random.uniform(50.0, 69.0), 2),
                            100.0,
                            term,
                        ),
                    )
                    total_marks += 1

    print(
        f"Seeded {total_marks} marks (including {len(math_spike_ids)} math-spike anomaly students)"
    )


def seed_attendance(cursor, student_ids):
    threshold_ids = random.sample(
        student_ids, min(ATTENDANCE_THRESHOLD_STUDENTS, len(student_ids))
    )
    medical_ids_query = (
        "SELECT student_id FROM students WHERE has_medical_accommodation = TRUE"
    )
    cursor.execute(medical_ids_query)
    medical_ids = [row[0] for row in cursor.fetchall()]

    start_date = date(2024, 9, 1)
    end_date = date(2024, 12, 20)
    total_attendance = 0

    for student_id in student_ids:
        current_date = start_date
        while current_date <= end_date:
            if current_date.weekday() >= 5:
                current_date += timedelta(days=1)
                continue

            if student_id in threshold_ids:
                status_weights = [0.50, 0.40, 0.05, 0.05]
            elif student_id in medical_ids:
                status_weights = [0.75, 0.05, 0.15, 0.05]
            else:
                status_weights = [0.85, 0.08, 0.05, 0.02]

            status = random.choices(
                ["Present", "Absent - Unexcused", "Absent - Excused", "Late"],
                weights=status_weights,
            )[0]

            reason = None
            if status in ["Absent - Unexcused", "Absent - Excused"]:
                reasons_unexcused = ["Overslept", "Family emergency", "No reason given"]
                reasons_excused = [
                    "Medical appointment",
                    "Illness with doctor note",
                    "Family bereavement",
                    "Religious holiday",
                ]
                reason = random.choice(
                    reasons_excused
                    if status == "Absent - Excused"
                    else reasons_unexcused
                )
            elif status == "Late":
                reason = random.choice(["Traffic", "Overslept", "Bus delay"])

            cursor.execute(
                """INSERT INTO attendance (student_id, date, status, reason)
                   VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING""",
                (student_id, current_date, status, reason),
            )
            total_attendance += 1
            current_date += timedelta(days=1)

    print(
        f"Seeded ~{total_attendance} attendance records (including {len(threshold_ids)} below-threshold students)"
    )


def main():
    print("Starting synthetic data generation...")
    print(f"Connecting to database at {os.getenv('DB_HOST', 'localhost')}...")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("\nSeeding subjects...")
        seed_subjects(cursor)
        conn.commit()

        print("\nSeeding students...")
        student_ids = seed_students(cursor)
        conn.commit()

        cursor.execute("SELECT subject_id, subject_name FROM subjects")
        subject_ids = cursor.fetchall()

        print("\nSeeding marks...")
        seed_marks(cursor, student_ids, subject_ids)
        conn.commit()

        print("\nSeeding attendance...")
        seed_attendance(cursor, student_ids)
        conn.commit()

        print("\n" + "=" * 60)
        print("Data generation complete!")
        print("=" * 60)
        print(f"  Students: {NUM_STUDENTS}")
        print(f"  Subjects: {len(SUBJECTS)}")
        print(f"  Math-spike anomaly students: {MATH_SPIKE_STUDENTS}")
        print(f"  Students below attendance threshold: {ATTENDANCE_THRESHOLD_STUDENTS}")
        print(
            f"  Medical accommodation students: ~{int(NUM_STUDENTS * MEDICAL_ACCOMMODATION_RATIO)}"
        )
        print("=" * 60)

    except Exception as e:
        conn.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
