import httpx
import time
from jose import jwt
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"
JWT_SECRET = "ello-dev-secret-change-in-production-k8x92m"

def get_token(user_id: str) -> str:
    r = httpx.post(f"{BASE_URL}/auth/login", json={"user_id": user_id})
    r.raise_for_status()
    return r.json()["access_token"]

def main():
    print("Getting JWTs...")
    alice_token = get_token("U001")
    bob_token = get_token("U002")
    admin_token = get_token("U003")

    headers_alice = {"Authorization": f"Bearer {alice_token}"}
    headers_bob = {"Authorization": f"Bearer {bob_token}"}
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    print("\n--- AUTH TESTS ---")
    r1 = httpx.get(f"{BASE_URL}/api/accounts/ACC001", headers=headers_alice)
    print(f"Alice valid JWT: {r1.status_code}")
    assert r1.status_code == 200

    r4 = httpx.get(f"{BASE_URL}/api/accounts/ACC001", headers={"Authorization": "Bearer invalid.token.here"})
    print(f"Invalid JWT: {r4.status_code}")
    assert r4.status_code == 401
    
    expired_token = jwt.encode(
        {"sub": "U001", "exp": datetime.utcnow() - timedelta(hours=1)},
        JWT_SECRET,
        algorithm="HS256"
    )
    r5 = httpx.get(f"{BASE_URL}/api/accounts/ACC001", headers={"Authorization": f"Bearer {expired_token}"})
    print(f"Expired JWT: {r5.status_code}")
    assert r5.status_code == 401

    print("\n--- BOLA TESTS ---")
    r_bola1 = httpx.get(f"{BASE_URL}/api/accounts/ACC001", headers=headers_alice)
    print(f"Alice -> ACC001: {r_bola1.status_code}")
    assert r_bola1.status_code == 200

    r_bola2 = httpx.get(f"{BASE_URL}/api/accounts/ACC002", headers=headers_alice)
    print(f"Alice -> ACC002: {r_bola2.status_code}")
    assert r_bola2.status_code == 403

    r_bola3 = httpx.get(f"{BASE_URL}/api/accounts/ACC002", headers=headers_bob)
    print(f"Bob -> ACC002: {r_bola3.status_code}")
    assert r_bola3.status_code == 200

    r_bola4 = httpx.get(f"{BASE_URL}/api/accounts/ACC002", headers=headers_admin)
    print(f"Admin -> ACC002: {r_bola4.status_code}")
    assert r_bola4.status_code == 200

    print("\n--- PAYLOAD SCAN TESTS ---")
    r_pay1 = httpx.get(f"{BASE_URL}/api/accounts/ACC001?q=normal", headers=headers_alice)
    print(f"Benign Query: {r_pay1.status_code}")
    assert r_pay1.status_code == 200

    r_pay2 = httpx.get(f"{BASE_URL}/api/accounts/ACC001?q=union%20select", headers=headers_alice)
    print(f"SQLi Payload (union select): {r_pay2.status_code}")
    assert r_pay2.status_code == 403

    # Need a POST route to test body scanning, but we can also just use existing POSTs if any.
    # Currently demo_api only has GETs for accounts and transactions. We will assume body scanner works based on unit logic, or we can use the login route (but it's not protected by gateway, so no payload scan).

    print("\n--- RATE LIMIT TESTS ---")
    # Send excessive traffic
    for i in range(120): # ELLO_RATE_LIMIT_RPM defaults to 60 or something
        r_rl = httpx.get(f"{BASE_URL}/api/accounts/ACC002", headers=headers_bob)
        if r_rl.status_code == 429:
            print(f"Rate limited after {i} requests: 429")
            break
    assert r_rl.status_code == 429

    print("\n--- PHASE 3 API CONTRACT TESTS ---")
    r_dash = httpx.get(f"{BASE_URL}/api/dashboard")
    print(f"GET /api/dashboard: {r_dash.status_code}")
    assert r_dash.status_code == 200
    
    r_ev = httpx.get(f"{BASE_URL}/api/events")
    print(f"GET /api/events: {r_ev.status_code}")
    assert r_ev.status_code == 200
    
    r_pol = httpx.get(f"{BASE_URL}/api/policies")
    print(f"GET /api/policies: {r_pol.status_code}")
    assert r_pol.status_code == 200
    
    r_hlth = httpx.get(f"{BASE_URL}/health")
    print(f"GET /health: {r_hlth.status_code}")
    assert r_hlth.status_code == 200

    r_sim = httpx.post(f"{BASE_URL}/api/simulator/bola", json={
        "attacker_user_id": "U001",
        "target_resource_id": "ACC002",
        "protection_mode": "ENFORCING"
    })
    print(f"POST /api/simulator/bola: {r_sim.status_code}")
    assert r_sim.status_code == 200
    assert r_sim.json()["action"] == "BLOCK"

    print("\nAll automated flow tests passed!")

if __name__ == "__main__":
    main()
