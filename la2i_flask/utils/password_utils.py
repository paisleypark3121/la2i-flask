import bcrypt
from utils.users import fake_users_db

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# def verify_password(plain_password, hashed_password):
#     return pwd_context.verify(plain_password, hashed_password)

def get_user(username: str):
    user_dict = fake_users_db.get(username)
    if user_dict:
        return user_dict

def authenticate_user(username: str, password: str):
    user = fake_users_db.get(username)
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user


def generate_hash():
    hashed_password1 = hash_password("password1")
    hashed_password2 = hash_password("password2")
    hashed_password3 = hash_password("password3")

    print(hashed_password1)
    print(hashed_password2)
    print(hashed_password3)

#generate_hash()