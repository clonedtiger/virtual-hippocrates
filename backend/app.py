# File: app.py (Refactored Backend)
import os
import json
import psycopg2
from psycopg2.extras import Json
from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback # For more detailed error logging

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# --- Database Configuration ---
DB_NAME = os.environ.get("DB_NAME", "medical_questionnaire_db")
DB_USER = os.environ.get("DB_USER", "db_user")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "db_user") # Ensure this is your actual strong password
DB_HOST = os.environ.get("DB_HOST", "localhost")
DB_PORT = os.environ.get("DB_PORT", "5432")

def get_db_connection():
    try:
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        return conn
    except psycopg2.Error as e:
        print(f"Error connecting to PostgreSQL database: {e}")
        raise

# --- Load/Sync Questionnaires from JSON Files into Database ---
QUESTIONNAIRE_DEFINITIONS_DIR = os.path.join(os.path.dirname(__file__), 'questionnaire_definitions')

def load_questionnaires_into_db():
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        print(f"Scanning for questionnaire JSON files in: {QUESTIONNAIRE_DEFINITIONS_DIR}")
        if not os.path.exists(QUESTIONNAIRE_DEFINITIONS_DIR):
            print(f"Warning: Questionnaire definitions directory not found: {QUESTIONNAIRE_DEFINITIONS_DIR}")
            return

        for filename in os.listdir(QUESTIONNAIRE_DEFINITIONS_DIR):
            if filename.endswith(".json"):
                filepath = os.path.join(QUESTIONNAIRE_DEFINITIONS_DIR, filename)
                print(f"Processing file: {filename}")
                with open(filepath, 'r') as f:
                    try:
                        q_data = json.load(f)
                        
                        q_key = q_data.get('questionnaireId')
                        q_version = q_data.get('version')
                        q_title = q_data.get('title')
                        q_description = q_data.get('description', '')
                        
                        if not all([q_key, q_version, q_title]):
                            print(f"Skipping {filename}: missing questionnaireId, version, or title.")
                            continue

                        cur.execute(
                            "SELECT id FROM questionnaires WHERE questionnaire_key = %s AND version = %s",
                            (q_key, q_version)
                        )
                        existing = cur.fetchone()
                        
                        if existing:
                            cur.execute(
                                """
                                UPDATE questionnaires 
                                SET title = %s, description = %s, definition = %s, updated_at = NOW()
                                WHERE questionnaire_key = %s AND version = %s
                                """,
                                (q_title, q_description, Json(q_data), q_key, q_version)
                            )
                            print(f"Updated questionnaire {q_key} version {q_version} in DB.")
                        else:
                            cur.execute(
                                """
                                INSERT INTO questionnaires (questionnaire_key, version, title, description, definition, is_active)
                                VALUES (%s, %s, %s, %s, %s, %s)
                                """,
                                (q_key, q_version, q_title, q_description, Json(q_data), True)
                            )
                            print(f"Inserted questionnaire {q_key} version {q_version} into DB.")
                        conn.commit()
                    except json.JSONDecodeError:
                        print(f"Skipping {filename}: Invalid JSON.")
                    except psycopg2.Error as db_err: # More specific error handling for DB operations
                        print(f"Database error processing {filename}: {db_err}")
                        if conn: conn.rollback()
                    except Exception as e:
                        print(f"General error processing {filename}: {e}")
                        if conn: conn.rollback()
        cur.close()
    except psycopg2.Error as db_conn_err: # Error with initial connection or cursor
        print(f"Initial database connection or cursor error in load_questionnaires_into_db: {db_conn_err}")
    except Exception as e:
        print(f"Unexpected error in load_questionnaires_into_db: {e}")
        traceback.print_exc()
    finally:
        if conn:
            conn.close()

# --- API Endpoints ---

@app.route('/api/questionnaire/<string:questionnaire_key>', methods=['GET'])
@app.route('/api/questionnaire/<string:questionnaire_key>/<string:version>', methods=['GET'])
def get_questionnaire_from_db(questionnaire_key, version=None):
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        sql_query = ""
        params = ()

        if version:
            sql_query = "SELECT definition FROM questionnaires WHERE questionnaire_key = %s AND version = %s AND is_active = true"
            params = (questionnaire_key, version)
        else: 
            sql_query = """
                SELECT definition FROM questionnaires 
                WHERE questionnaire_key = %s AND is_active = true
                ORDER BY string_to_array(version, '.')::int[] DESC NULLS LAST
                LIMIT 1 
                """
            params = (questionnaire_key,)

        cur.execute(sql_query, params)
        result = cur.fetchone()
        cur.close()
        
        if result and result[0]:
            return jsonify(result[0]) 
        else:
            # This is the JSON 404 if data isn't found in DB
            return jsonify({"error": f"Questionnaire '{questionnaire_key}' (v{version or 'latest active'}) not found or not active"}), 404
            
    except psycopg2.Error as db_err:
        print(f"Database error fetching questionnaire {questionnaire_key} v{version}: {db_err}")
        traceback.print_exc()
        return jsonify({"error": "Database server error fetching questionnaire", "details": str(db_err)}), 500
    except Exception as e:
        print(f"Unexpected error fetching questionnaire {questionnaire_key} v{version}: {e}")
        traceback.print_exc()
        return jsonify({"error": "Unexpected server error fetching questionnaire"}), 500
    finally:
        if conn:
            conn.close()

# REMOVED the old get_questionnaire function that loaded from ALL_QUESTIONNAIRES_DATA

@app.route('/api/submit-answers', methods=['POST'])
def submit_answers():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No data provided"}), 400

    questionnaire_key = data.get('questionnaireKey')
    questionnaire_version_answered = data.get('questionnaireVersion')
    answers = data.get('answers')

    if not questionnaire_key or not questionnaire_version_answered or answers is None:
        return jsonify({"error": "Missing questionnaireKey, questionnaireVersion, or answers"}), 400

    print(f"Received answers for questionnaire '{questionnaire_key}' version '{questionnaire_version_answered}': {answers}")

    conn = None
    patient_id_to_use = None 

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        if questionnaire_key == "PATIENT_REG_001":
            name = answers.get("reg_name")
            email = answers.get("reg_email")
            if not name or not email:
                return jsonify({"error": "Name and email are required for registration"}), 400

            cur.execute("SELECT patient_id FROM patients WHERE email = %s;", (email,))
            existing_patient = cur.fetchone()

            if existing_patient:
                patient_id_to_use = existing_patient[0]
                print(f"Existing patient found with email {email}, patient_id: {patient_id_to_use}")
            else:
                cur.execute(
                    "INSERT INTO patients (name, email) VALUES (%s, %s) RETURNING patient_id;",
                    (name, email)
                )
                patient_id_to_use = cur.fetchone()[0]
                print(f"New patient created with email {email}, patient_id: {patient_id_to_use}")
            conn.commit()
        else:
            print(f"Processing non-registration questionnaire: {questionnaire_key}")
            cur.execute("SELECT patient_id FROM patients ORDER BY patient_id DESC LIMIT 1;")
            last_patient = cur.fetchone()
            if last_patient:
                patient_id_to_use = last_patient[0]
                print(f"Using patient_id {patient_id_to_use} (most recent) for questionnaire '{questionnaire_key}'.")
            else:
                cur.close()
                return jsonify({"error": "No patient record found. Please complete registration first."}), 400
        
        if patient_id_to_use is not None:
            sql_response_insert = """
                INSERT INTO patient_questionnaire_responses 
                (patient_id, questionnaire_id, questionnaire_version, answers) 
                VALUES (%s, %s, %s, %s) RETURNING response_id;
            """
            cur.execute(sql_response_insert, (
                patient_id_to_use, 
                questionnaire_key, 
                questionnaire_version_answered, 
                Json(answers)
            ))
            response_id = cur.fetchone()[0]
            conn.commit() 
            
            cur.close()
            return jsonify({
                "message": "Answers submitted successfully",
                "responseId": response_id,
                "patientId": patient_id_to_use,
                "questionnaireKey": questionnaire_key,
                "questionnaireVersion": questionnaire_version_answered,
                "answers": answers
            }), 201
        else:
            cur.close()
            return jsonify({"error": "Could not determine patient for storing responses."}), 500

    except psycopg2.Error as e:
        if conn: conn.rollback()
        print(f"Database error in submit_answers: {e}")
        print(f"PostgreSQL Error Code: {e.pgcode}, Diagnostics: {e.diag.message_primary if e.diag else 'N/A'}")
        return jsonify({"error": "Database error occurred during submission.", "details": str(e)}), 500
    except Exception as e:
        if conn: conn.rollback()
        print(f"An unexpected error occurred in submit_answers: {e}")
        traceback.print_exc()
        return jsonify({"error": "An unexpected server error occurred during submission."}), 500
    finally:
        if conn:
            conn.close()

# REMOVED the ALL_QUESTIONNAIRES_DATA global variable and load_all_questionnaires_from_file() function

def create_initial_tables():
    """Creates tables if they don't exist. Good for local dev setup."""
    conn = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        # Patients Table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS patients (
            patient_id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP 
            -- Add other PII fields here if needed
        );
        """)
        # Questionnaires Table (to store definitions)
        cur.execute("""
        CREATE TABLE IF NOT EXISTS questionnaires (
            id SERIAL PRIMARY KEY,
            questionnaire_key VARCHAR(100) NOT NULL,
            version VARCHAR(20) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            definition JSONB NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (questionnaire_key, version)
        );
        """)
        # Patient Questionnaire Responses Table
        cur.execute("""
        CREATE TABLE IF NOT EXISTS patient_questionnaire_responses (
            response_id SERIAL PRIMARY KEY,
            patient_id INTEGER REFERENCES patients(patient_id) ON DELETE SET NULL,
            questionnaire_id VARCHAR(100) NOT NULL, -- Stores the questionnaire_key
            questionnaire_version VARCHAR(50) NOT NULL,
            answers JSONB NOT NULL,
            submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """)
        # Trigger for patients.updated_at
        cur.execute("""
            CREATE OR REPLACE FUNCTION update_modified_column()
            RETURNS TRIGGER AS $$
            BEGIN
               NEW.updated_at = now();
               RETURN NEW;
            END;
            $$ language 'plpgsql';
        """)
        cur.execute("""
            DROP TRIGGER IF EXISTS update_patient_modtime ON patients; 
            CREATE TRIGGER update_patient_modtime
            BEFORE UPDATE ON patients
            FOR EACH ROW
            EXECUTE FUNCTION update_modified_column();
        """)
        # Trigger for questionnaires.updated_at
        cur.execute("""
            DROP TRIGGER IF EXISTS update_questionnaire_modtime ON questionnaires;
            CREATE TRIGGER update_questionnaire_modtime
            BEFORE UPDATE ON questionnaires
            FOR EACH ROW
            EXECUTE FUNCTION update_modified_column();
        """)
        conn.commit()
        cur.close()
        print("Initial tables checked/created successfully.")
    except Exception as e:
        print(f"Error creating initial tables: {e}")
        traceback.print_exc()
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    print("Checking and creating initial database tables if necessary...")
    create_initial_tables() # Ensure tables exist before loading data into them
    
    print("Loading questionnaires into database...")
    load_questionnaires_into_db()
    
    print("Starting Flask application...")
    app.run(debug=True, port=5001)

# REMOVED the second, redundant if __name__ == '__main__': block
