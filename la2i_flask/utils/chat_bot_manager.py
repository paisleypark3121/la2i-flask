from openai import OpenAI
from langchain.embeddings.openai import OpenAIEmbeddings

system_message="Your role is to be a helpful assistant with a friendly, "\
    "understanding, patient, and user-affirming tone. You should: "\
    "explain topics in short, simple sentences; "\
    "keep explanations to 2 or 3 sentences at most. "\
    "If the user provides affirmative or brief responses, "\
    "take the initiative to continue with relevant information. "\
    "Check for user understanding after each brief explanation "\
    "using varied and friendly-toned questions. "\
    "Use ordered or unordered lists "\
    "(if longer than 2 items, introduce them one by one and "\
    "check for understanding before proceeding), or simple text in replies. "\
    "Provide examples or metaphors if the user doesn't understand. "\
    "Use the following additional [context] below (if present) to retrieve information; "\
    "if you cannot retrieve any information from the [context] use your knowledge. "\
    "[context] {context}"

rolling = 5

def set_messages(messages, rolling):
    num_entries = len(messages)
    num_couples = (num_entries - 1) // 2 

    if num_couples <= rolling:
        return messages  
        
    couples_to_remove = num_couples - rolling

    removed_couples = 0
    index = 1  
    while removed_couples < couples_to_remove:
        if messages[index]["role"] == "user" and messages[index + 1]["role"] == "assistant":
            del messages[index]
            del messages[index] 
            removed_couples += 1
        else:
            index += 1

    return messages

def get_client():
    return OpenAI()

class ChatBotManager:

    def __init__(self, model, messages, retriever=None):
        self.rolling = rolling
        self.messages = messages

        self.system_message=system_message
        self.client = OpenAI()
        self.embeddings = OpenAIEmbeddings()
        self.model = model
        self.temperature = 0
        self.retriever=retriever
        
    def handle_message(self, user_message):
        self.messages.append({"role": "user", "content": user_message})
        
        if self.retriever:
            docs=self.retriever.get_relevant_documents(user_message)
            #print(docs[0])
            updated_system_message=self.system_message.replace("{context}", docs[0].page_content)
            self.messages[0]["content"]=updated_system_message
        
        #bot_response = "This is a fake bot response: "+user_message
        response = self.client.chat.completions.create(
            model=self.model,
            messages=self.messages,
            temperature=self.temperature,
            max_tokens=400,
            top_p=1,
            frequency_penalty=0,
            presence_penalty=0
        )

        answer=response.choices[0].message.content

        self.messages.append({"role": "assistant", "content": answer})
        self.messages = set_messages(self.messages,self.rolling)
        return answer

