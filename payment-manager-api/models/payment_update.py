from typing import Optional
from pydantic import BaseModel

class PaymentUpdateModel(BaseModel):
    due_amount: Optional[float] = None
    payee_payment_status: Optional[str] = None
    payee_due_date: Optional[str] = None