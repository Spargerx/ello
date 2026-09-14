import httpx

BASE_URL = "http://localhost:8000"

def main():
    r = httpx.post(f"{BASE_URL}/auth/login", json={"user_id": "U001"})
    alice_token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {alice_token}"}

    # BOLA request
    r2 = httpx.get(f"{BASE_URL}/api/accounts/ACC002", headers=headers)
    print(f"Alice -> ACC002 (Detection Only): {r2.status_code}")
    assert r2.status_code == 200
    
    # Payload
    r3 = httpx.get(f"{BASE_URL}/api/accounts/ACC001?q=union%20select", headers=headers)
    print(f"Payload -> ACC001 (Detection Only): {r3.status_code}")
    assert r3.status_code == 200
    
    print("Detection only tests passed!")

if __name__ == "__main__":
    main()
