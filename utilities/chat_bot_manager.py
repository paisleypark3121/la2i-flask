import json
from openai import OpenAI
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain.retrievers import WikipediaRetriever

system_message_en="Your role is to be a helpful assistant with a friendly, "\
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

system_message_en_nolimits="Your role is to be a helpful assistant with a friendly, "\
    "understanding, patient, and user-affirming tone. "\
    "If the user provides affirmative or brief responses, "\
    "take the initiative to continue with relevant information. "\
    "Provide examples or metaphors if the user doesn't understand. "\
    "Use the following additional [context] below (if present) to retrieve information; "\
    "if you cannot retrieve any information from the [context] use your knowledge. "\
    "[context] {context}"

system_message_it="Il tuo ruolo è essere un assistente disponibile con un tono amichevole, "\
    "comprensivo, paziente e affermativo nei confronti dell'utente. Dovresti "\
    "spiegare argomenti in frasi brevi e semplici, "\
    "mantenendo le spiegazioni in massimo 2 o 3 frasi. "\
    "Se l'utente fornisce risposte affermative o brevi, "\
    "prendi l'iniziativa di continuare con informazioni pertinenti. "\
    "Verifica la comprensione dell'utente dopo ogni breve spiegazione "\
    "utilizzando domande variegate e amichevoli. "\
    "Usa elenchi ordinati o non ordinati "\
    "(se più lunghi di 2 elementi, introducili uno alla volta e verifica la comprensione prima di procedere) "\
    "o testo semplice nelle risposte "\
    "Fornisci esempi o metafore se l'utente non comprende. "\
    "Utilizza le seguenti informazioni aggiuntive dal [context] (se presente) per recuperare informazioni; "\
    "se non riesci a recuperare alcuna informazione dal [context], usa le tue conoscenze "\
    "[context] {context}"

system_message_it_nolimits="Il tuo ruolo è essere un assistente disponibile con un tono amichevole, "\
    "comprensivo, paziente e affermativo nei confronti dell'utente. "\
    "Se l'utente fornisce risposte affermative o brevi, "\
    "prendi l'iniziativa di continuare con informazioni pertinenti. "\
    "Fornisci esempi o metafore se l'utente non comprende. "\
    "Utilizza le seguenti informazioni aggiuntive dal [context] (se presente) per recuperare informazioni; "\
    "se non riesci a recuperare alcuna informazione dal [context], usa le tue conoscenze "\
    "[context] {context}"

rolling = 10

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

    def __init__(self, language, model, messages, vectordb=None):
        self.rolling = rolling
        self.language=language
        self.model = model
        self.messages = messages
        if self.language=='italian':
            if 'personal' in self.model:                
                self.system_message=system_message_it
                #print("personal-it")
            else:
                self.system_message=system_message_it_nolimits
                #print("nolimits-it")
        else:
            if 'personal' in self.model:                
                self.system_message=system_message_en
                #print("personal-en")
            else:
                self.system_message=system_message_en_nolimits
                #print("nolimits-en")
        self.client = OpenAI()
        self.embeddings = OpenAIEmbeddings()
        self.temperature = 0
        self.vectordb = vectordb

        if self.messages is None or self.messages==[]:
            #print("SET SYSTEM")
            self.messages = [{"role": "system", "content": self.system_message}]
        
        #print("INIT")
        #print(self.messages)
        
    def handle_message(self, user_message):
        self.messages.append({"role": "user", "content": user_message})
        
        if self.vectordb:
            docs=self.vectordb.similarity_search_with_relevance_scores(user_message)
            print("docs: "+str(len(docs)))
            result=docs[0][0].page_content
            if len(docs)>1:
                result=result+"\n\n"+docs[1][0].page_content
            updated_system_message=self.system_message.replace("{context}", result)
            self.messages[0]["content"]=updated_system_message
        print("MESSAGES")
        print(self.messages)
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

    def handle_wiki(self, user_message):
        self.messages.append({"role": "user", "content": user_message})
        
        retriever = WikipediaRetriever()
        docs = retriever.get_relevant_documents(user_message)

        answer=docs[0].metadata['summary'][:20]

        # print(docs[0].page_content[:20])
        # print(docs[0].metadata['title'])
        # print(docs[0].metadata['summary'][:20])
        # print(docs[0].metadata['source'])

        self.messages.append({"role": "assistant", "content": answer})
        self.messages = set_messages(self.messages,self.rolling)
        
        titles_sources = [[doc.metadata['title'], doc.metadata['source']] for doc in docs]
        data = {
            "answer": answer,
            "titles_sources": titles_sources
        }
        return json.dumps(data)
