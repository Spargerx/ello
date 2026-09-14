"""Demo fintech API endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import verify_gateway
from app.db.database import get_db
from app.gateway.middleware import GatewayResult
from app.models.account import Account
from app.models.transaction import Transaction
from app.schemas.api_schemas import AccountResponse, TransactionResponse

router = APIRouter()


@router.get("/accounts/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    gateway: GatewayResult = Depends(verify_gateway),
):
    """
    Get account details.
    Protected by the gateway. If BOLA is detected, `verify_gateway` blocks execution
    before this function is even called.
    """
    result = await db.execute(select(Account).where(Account.account_id == account_id))
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    return account


@router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: str,
    db: AsyncSession = Depends(get_db),
    gateway: GatewayResult = Depends(verify_gateway),
):
    """Get transaction details."""
    result = await db.execute(
        select(Transaction).where(Transaction.tx_id == transaction_id)
    )
    tx = result.scalar_one_or_none()
    
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return tx
