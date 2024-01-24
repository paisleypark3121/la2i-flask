from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()
OpenAI.api_key=os.getenv('OPENAI_API_KEY')

client = OpenAI()

def upload():
    response=client.files.create(
        file=open('../dsa/dsa_italian.jsonl','rb'),
        purpose='fine-tune')
    print(response) 

def fine_tune():
    file_id='ABC'
    response=client.fine_tuning.jobs.create(
        training_file=file_id,
        model="gpt-3.5-turbo-1106")
    print(response)

def get_file_status():
    try:
        job_id="ABC"
        response=client.fine_tuning.jobs.retrieve(job_id)
        print(response)
        # file_id='ABC'
        # file_info = openai.File.retrieve(file_id)
        # print(file_info.status)
        # print(file_info.status_details)
    except openai.error.OpenAIError as e:
        print("Error while retrieving file status:", e)
        return None
    
user_input = input(
  "\nScegli:"+
  "\n1. upload jsonl file"+
  "\n2. fine-tune"+
  "\n3. status"+
  "\n\n>")

if (user_input == "1"):
    upload()
elif (user_input == "2"):
    fine_tune()
elif (user_input == "3"):
    get_file_status()
else:
    print("INVALID SELECTION")