from beanie import Document
from pydantic import  EmailStr, Field
from typing import Optional
from datetime import datetime


class Payment(Document):
    payee_first_name: str
    payee_last_name: str
    payee_payment_status: str  # completed, due_now, overdue, pending
    payee_added_date_utc: datetime
    payee_due_date: datetime
    payee_address_line_1: str
    payee_address_line_2: Optional[str] = None
    payee_city: str
    payee_country: str  # ISO 3166-1 alpha-2
    payee_province_or_state: Optional[str] = None
    payee_postal_code: str
    payee_phone_number: str  # E.164 format
    payee_email: EmailStr
    currency: str  # ISO 4217
    discount_percent: Optional[float] = 0.0  # Percentage
    tax_percent: Optional[float] = 0.0  # Percentage
    due_amount: float  # Mandatory, 2 decimal points
    total_due: Optional[float] = Field(default=None)  # Calculated
    evidence_file_id: Optional[str] = None
    evidence_file_ext: Optional[str] = None

    class Settings:
        name = "payments"  # MongoDB collection name