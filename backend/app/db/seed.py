"""Database seeder to generate Alice, Bob, Admin and their resources."""

import asyncio
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import async_session, init_db
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction


async def seed_data(db: AsyncSession):
    """Seed initial data if the database is empty."""
    # Check if already seeded
    result = await db.execute(select(User).limit(1))
    if result.first():
        print("Database already seeded. Skipping.")
        return

    print("Seeding database...")

    # 1. Users
    u001 = User(user_id="U001", username="Alice", email="alice@example.com", role="user")
    u002 = User(user_id="U002", username="Bob", email="bob@example.com", role="user")
    u003 = User(user_id="U003", username="Admin", email="admin@example.com", role="admin")

    db.add_all([u001, u002, u003])
    await db.flush()

    # 2. Accounts
    acc001 = Account(
        account_id="ACC001", owner_user_id="U001", account_type="checking", balance=Decimal("1500.00"), label="Alice's Checking"
    )
    acc002 = Account(
        account_id="ACC002", owner_user_id="U002", account_type="savings", balance=Decimal("12000.50"), label="Bob's Savings"
    )
    acc003 = Account(
        account_id="ACC003", owner_user_id="U003", account_type="admin_op", balance=Decimal("0.00"), label="Admin Ops"
    )

    db.add_all([acc001, acc002, acc003])
    await db.flush()

    # 3. Transactions
    tx1 = Transaction(
        tx_id="TX001", account_id="ACC001", amount=Decimal("-45.00"), description="Grocery store", tx_type="debit"
    )
    tx2 = Transaction(
        tx_id="TX002", account_id="ACC002", amount=Decimal("1500.00"), description="Salary deposit", tx_type="credit"
    )

    db.add_all([tx1, tx2])
    await db.commit()

    print("Seeding complete: Created users (Alice, Bob, Admin), accounts (ACC001, ACC002, ACC003), and transactions.")


async def main():
    await init_db()
    async with async_session() as db:
        await seed_data(db)


if __name__ == "__main__":
    asyncio.run(main())
