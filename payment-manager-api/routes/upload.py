from fastapi import APIRouter, UploadFile, File, HTTPException  
from models.payment import Payment
import pandas as pd
import io
from typing import List

router = APIRouter()

# Function to process the uploaded CSV file
async def process_file(file: UploadFile) -> List[Payment]:
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))

    # Required columns
    required_columns = [
        "payee_first_name", "payee_last_name", "payee_payment_status", "payee_added_date_utc",
        "payee_due_date", "payee_address_line_1", "payee_city", "payee_country",
        "payee_postal_code", "payee_phone_number", "payee_email", "currency", "due_amount"
    ]

    # Drop rows with missing mandatory fields
    df = df.dropna(subset=required_columns)

    # Normalize specific fields
    df["payee_country"] = df["payee_country"].str.upper()
    df["currency"] = df["currency"].str.upper()
    df["payee_added_date_utc"] = pd.to_datetime(df["payee_added_date_utc"],unit="s", errors="coerce")
    df["payee_due_date"] = pd.to_datetime(df["payee_due_date"], errors="coerce")

    # Drop rows with invalid dates
    df = df.dropna(subset=["payee_added_date_utc", "payee_due_date"])

    # Ensure postal code and phone are treated as a string (this handles any numeric representation with leading zeros)
    df["payee_postal_code"] = df["payee_postal_code"].astype(str)
    df["payee_phone_number"] = df["payee_phone_number"].astype(str)

    # Default optional fields
    df["discount_percent"] = df["discount_percent"].fillna(0.0)
    df["tax_percent"] = df["tax_percent"].fillna(0.0)

    # Calculate total_due
    df["total_due"] = df["due_amount"] * (1 - df["discount_percent"] / 100) * (1 + df["tax_percent"] / 100)

    # Convert valid rows into Payment documents
    payments = [
        Payment(**row.to_dict())
        for _, row in df.iterrows()
    ]
    return payments


"""
Endpoint to add payments from a CSV file.
Args:
    file (UploadFile): The uploaded CSV file containing payment data.
Raises:
    HTTPException: If the file is not a CSV file.
    HTTPException: If no valid data is found to insert.
    HTTPException: If an error occurs during processing.
Returns:
    dict: A message indicating the number of payments inserted successfully.
"""
@router.post("/payments")
async def add_payments(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    try:
        # Read and normalize the CSV data
        payments = await process_file(file)

        # Insert data into MongoDB if there are valid payments
        if payments:
            await Payment.insert_many(payments)
            return {"message": f"{len(payments)} payments inserted successfully."}
        else:
            raise HTTPException(status_code=400, detail="No valid data found to insert.")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

