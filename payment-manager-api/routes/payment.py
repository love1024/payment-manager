from fastapi import APIRouter, Body, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from models.payment import Payment
from bson import ObjectId
from typing import Optional
from fastapi import Query
from datetime import datetime
from config.config import get_gridfs_bucket
from models.payment_update import PaymentUpdateModel

router = APIRouter()

# Allowed file extensions and maximum size in bytes
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


"""
Fetch a paginated list of payments with optional search and status filters.
Args:
    page (int): The page number to retrieve, defaults to 1.
    per_page (int): The number of items per page, defaults to 50.
    search (Optional[str]): A search term to filter payments by payee details, defaults to None.
    status (Optional[str]): A status to filter payments by payment status, defaults to None.
Returns:
    dict: A dictionary containing metadata about the pagination and the list of payments.
Metadata:
    page (int): The current page number.
    per_page (int): The number of items per page.
    page_count (int): The total number of pages.
    total_count (int): The total number of payments.
    links (list): A list of pagination links (self, first, previous, next, last).
Payments:
    list: A list of payment objects with updated payment status and total due amount.
"""
@router.get("/")
async def get_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
    ):
    query = {}
    if search:
        query["$or"] = [
            {"payee_first_name": {"$regex": search, "$options": "i"}},
            {"payee_last_name": {"$regex": search, "$options": "i"}},
            {"payee_address_line_1": {"$regex": search, "$options": "i"}},
            {"payee_address_line_2": {"$regex": search, "$options": "i"}},
            {"payee_city": {"$regex": search, "$options": "i"}},
            {"payee_country": {"$regex": search, "$options": "i"}},
            {"payee_email": {"$regex": search, "$options": "i"}}
        ]

    skip = (page - 1) * per_page
    today = datetime.utcnow().date()
    payments = await Payment.find(query).sort("-payee_added_date_utc").skip(skip).limit(per_page).to_list()

    filtered_payments = []
    for payment in payments:
        due_date = payment.payee_due_date.date()
        if payment.evidence_file_id is not None:
            payment.payee_payment_status = "completed"
        elif due_date == today:
            payment.payee_payment_status = "due_now"
        elif due_date < today:
            payment.payee_payment_status = "overdue"
        
        tax_amount = payment.due_amount * (payment.tax_percent / 100)
        discount_amount = payment.due_amount * (payment.discount_percent / 100)
        payment.total_due = round(payment.due_amount + tax_amount - discount_amount, 2)

        # Add to the filtered list based on status
        if not status or payment.payee_payment_status == status:
            filtered_payments.append(payment)

    total_count = await get_total_count(query, status)

    # total_count = await Payment.find(query).count()
    page_count = (total_count + per_page - 1) // per_page

    response = {
        "metadata": {
            "page": page,
            "per_page": per_page,
            "page_count": page_count,
            "total_count": total_count,
            "links": [
                {"self": f"/payments?page={page}&per_page={per_page}"},
                {"first": f"/payments?offset=1&per_page={per_page}"},
                {"previous": f"/payments?page={max(1, page - 1)}&per_page={per_page}"},
                {"next": f"/payments?page={min(page_count, page + 1)}&per_page={per_page}"},
                {"last": f"/payments?page={page_count}&per_page={per_page}"}
            ]
        },
        "payments": filtered_payments
    }

    return response
    




"""
Add a new payment.

This endpoint allows you to add a new payment to the system. The payment details
are provided in the request body and the payment is created with the current UTC
timestamp as the payee added date.

Args:
    payment (Payment): The payment details provided in the request body.

Returns:
    Payment: The created payment object with the details of the newly added payment.

Raises:
    HTTPException: If there is an error while creating the payment.
"""
@router.post("/", response_model=Payment)
async def add_payments(payment: Payment = Body(...)):
    payment.payee_added_date_utc = datetime.utcnow()
    created_payment = await payment.create()
    return created_payment



"""
Delete a payment by its ID.

Args:
    payment_id (str): The ID of the payment to be deleted.

Returns:
    dict: A message indicating that the payment was deleted successfully.

Raises:
    HTTPException: If the payment with the given ID is not found.
"""
@router.delete("/{payment_id}", response_model=dict)
async def delete_payment(payment_id: str):
    payment = await Payment.get(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    await payment.delete()
    return {"message": "Payment deleted successfully"}


"""
Update a payment record.
This endpoint allows updating specific fields of a payment record identified by `payment_id`.
Only the fields provided in the `payment_data` will be updated.
Args:
    payment_id (str): The unique identifier of the payment to be updated.
    payment_data (PaymentUpdateModel): The data to update the payment with. Only the fields
        provided in this model will be updated.
Returns:
    Payment: The updated payment record.
Raises:
    HTTPException: If the payment with the given `payment_id` is not found (status code 404).
    HTTPException: If attempting to mark the payment as complete without an `evidence_file_id` (status code 400).
"""
@router.patch("/{payment_id}", response_model=Payment)
async def update_payment(payment_id: str, payment_data: PaymentUpdateModel = Body(...)):
    payment = await Payment.get(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update_data = payment_data.dict(exclude_unset=True)


    # Check if the status is being changed to 'complete'
    if update_data.get("payee_payment_status") == "complete":
        # Ensure `evidence_file_id` exists
        if not payment.evidence_file_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot mark payment as complete without evidence_file_id"
            )
        
    for key, value in update_data.items():
        setattr(payment, key, value)
    await payment.save()

    return payment


"""
Uploads an evidence file for a specific payment.
Args:
    payment_id (str): The ID of the payment to which the evidence file will be attached.
    file (UploadFile): The file to be uploaded.
Raises:
    HTTPException: If the file extension is not allowed.
    HTTPException: If the file size exceeds the maximum limit.
    HTTPException: If the payment record is not found.
Returns:
    dict: A dictionary containing the file ID and a success message.
"""
@router.post("/{payment_id}/evidence")
async def upload_file(payment_id: str, file: UploadFile = File(...)):
    # Validate the file extension
    file_extension = file.filename[file.filename.rfind("."):].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension. Allowed extensions are: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Validate the file size
    file_size = await file.read()
    if len(file_size) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds the maximum limit of {MAX_FILE_SIZE // (1024 * 1024)} MB."
        )
    # Reset the file read pointer
    file.file.seek(0)


    # Find the payment record
    payment = await Payment.get(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    gridfs_bucket = get_gridfs_bucket()

    # Upload the file to GridFS
    file_id = await gridfs_bucket.upload_from_stream(
        file.filename, file.file, metadata={"content_type": file.content_type}
    )
    
    # Update the payment with the file ID
    payment.evidence_file_id = str(file_id)
    await payment.save()
    
    return {"file_id": str(file_id), "message": "Evidence uploaded successfully"}


"""
Download a file from GridFS using the provided evidence_file_id.

Args:
    evidence_file_id (str): The ID of the file to be downloaded.

Raises:
    HTTPException: If the evidence_file_id is not a valid ObjectId.
    HTTPException: If the file is not found in GridFS.

Returns:
    StreamingResponse: The file data as a streaming response with the appropriate content type and headers.
"""
@router.get("/evidence/{evidence_file_id}")
async def download_file(evidence_file_id: str):
    # Validate if the evidence_file_id is a valid ObjectId
    try:
        file_id = ObjectId(evidence_file_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid evidence_file_id")

    gridfs_bucket = get_gridfs_bucket()

    # Retrieve the file from GridFS
    try:
        file_data = await gridfs_bucket.open_download_stream(file_id)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")


    # Return the file as a response with the appropriate content type
    return StreamingResponse(
        file_data,
        media_type=file_data.metadata.get("content_type", "application/octet-stream"),
        headers={"Content-Disposition": f'attachment; filename="{file_data.name}"'}
    )




"""
Calculate the total count of payments based on the given query and status.

Args:
    query (dict): The query to filter payments.
    status (str): The status to filter payments. Can be "completed", "due_now", "overdue", or None.

Returns:
    int: The total count of payments that match the given status.
"""
async def get_total_count(query, status):
    today = datetime.utcnow().date()
    payments_for_count = await Payment.find(query).to_list()
    total_count = 0
    for payment in payments_for_count:
        due_date = payment.payee_due_date.date()
        if payment.evidence_file_id is not None:
            payment.payee_payment_status = "completed"
        elif due_date == today:
            payment.payee_payment_status = "due_now"
        elif due_date < today:
            payment.payee_payment_status = "overdue"
        # Add to the filtered list based on status
        if not status or payment.payee_payment_status == status:
            total_count += 1
    return total_count