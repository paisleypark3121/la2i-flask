import json

def check_credentials(username, password):
    with open("utils/users.json", "r") as file:
        user_data = json.load(file)
        for user in user_data:
            if user["username"] == username and user["password"] == password:
                return True
    return False

# Function to insert or update a user in the "users.json" file
def insert_user(username, password):
    # Read the existing user data from the file
    with open("utils/users.json", "r") as file:
        user_data = json.load(file)
    
    # Check if the username already exists
    for user in user_data:
        if user["username"] == username:
            user["password"] = password  # Update the password for the existing user
            with open("users.json", "w") as file:
                json.dump(user_data, file, indent=4)
            print(f"User '{username}' has been updated with the new password.")
            return

    # If the username does not exist, add a new user
    new_user = {"username": username, "password": password}
    user_data.append(new_user)

    # Write the updated user data back to the file
    with open("utils/users.json", "w") as file:
        json.dump(user_data, file, indent=4)

    print(f"User '{username}' has been successfully inserted.")

# Function to delete a user from the "users.json" file based on username
def delete_myuser(username):

    # Read the existing user data from the file
    with open("utils/users.json", "r") as file:
        user_data = json.load(file)
    
    # Check if the username exists in the user data
    found = False
    for user in user_data:
        if user["username"] == username:
            user_data.remove(user)
            found = True
            break

    if found:
        # Write the updated user data (with the user removed) back to the file
        with open("utils/users.json", "w") as file:
            json.dump(user_data, file, indent=4)
        print(f"User '{username}' has been successfully deleted.")
    else:
        print(f"User '{username}' not found. Nothing to delete.")


def main():
    code=input("Insert code: ")
    if code=="0":
        username="test"
        password="test"
        ret=insert_user(username,password)
        print(ret)
    elif code=="1":
        username="test"
        password="test"
        ret=check_credentials(username,password)
        print(ret)
    elif code=="2":
        username="test"
        ret=delete_user(username)
        print(ret)
    else:
        print("Wrong selection")

#main()
        
