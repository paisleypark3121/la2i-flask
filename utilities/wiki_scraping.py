import re
import wikipedia
from Wikipedia2PDF import Wikipedia2PDF
from bs4 import BeautifulSoup
from pylatexenc.latex2text import LatexNodes2Text
from utilities.chromadb_manager import *

''' Extracts all latex tags from the wikipedia page '''
def extract_tags(content):
    tags = []
    start = content.find('{\\displaystyle')
    while start != -1:
        end = start
        balance = 0
        while end < len(content):
            if content[end] == '{':
                balance += 1
            elif content[end] == '}':
                balance -= 1
                if balance == 0:
                    break
            end += 1
        tags.append(content[start:end + 1])
        start = content.find('{\\displaystyle', end)
    return tags

def remove_rows_before_tag(content, tag):
    lines = content.split('\n')
    tag_index = [i for i, line in enumerate(lines) if re.search(re.escape(tag), line)]
    
    for index in tag_index:
        i = index - 1
        while i >= 0 and (not lines[i].strip() or len(lines[i].strip()) <= 3):
            del lines[i]
            i -= 1

    return '\n'.join(lines)

''' Returns the titles of the pages related to the topic '''
def wiki_search(topic):
    try:
        return wikipedia.search(topic)
    except Exception as e:
        print("error in searching "+topic+" from wikipedia: "+str(e))
        return None

''' 
Returns the page for the specified title
please note that the url is simply the title with _ instead of blanks
- page.url -> returns the url
- page.title -> returns the title
- page.summary -> returns the summary for the page
- page.content -> returns the textual content for the page
'''
def wiki_page(title):
    try:
        return wikipedia.page(title)
    except Exception as e:
        print("error in retrieving page "+title+" from wikipedia: "+str(e))
        return None

'''
Returns the text with simple text replacing latex
content is the textual content from page.content
'''
def wiki_content_text(content):

    tags = extract_tags(content)

    for tag in tags:
        content = remove_rows_before_tag(content, tag).replace(f'{tag}\n', f'{tag}')

        while f' {tag}' in content:
            content = content.replace(f' {tag}', tag)
        while f'{tag} ' in content:
            content = content.replace(f'{tag} ', tag)
        
        content = content.replace(f'\n{tag}', f'{tag}')
        content = content.replace(tag, f' {tag} ')

    for tag in tags:
        try:
            replaced_tag=LatexNodes2Text().latex_to_text(tag)
            content = content.replace(tag, replaced_tag)
        except e:
            print(tag+" - "+e)

    return content

'''
Returns the persist_directory for the chromadb associated to the wiki page with give title
'''
def wiki_page2chromadb(title,contentId,embedding,chunk_size,chunk_overlap):

    page=get_page(title)
    if page is None:
        return None

    content=wiki_content_text(page.content)
    persist_directory="/vector_store/store_"+str(contentId)
    
    vectordb=create_vectordb_from_content(
        content=content,
        embedding=embedding,
        persist_directory=persist_directory,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap)
    
    if vectordb is None:
        return None
    
    return persist_directory

def test():
    response=wiki_search("Donald Trump")
    print(response)
    ['Donald Trump', 'Donald Trump Jr.', 'Family of Donald Trump', 'Donald Trump sexual misconduct allegations', 'E. Jean Carroll v. Donald J. Trump', 'Donald Trump 2024 presidential campaign', 'Presidency of Donald Trump', 'Personal and business legal affairs of Donald Trump', 'Political positions of Donald Trump', 'Donald Trump 2016 presidential campaign']

    response=wiki_page(response[0])
    print(response.title)
    print(response.url) # it's the title with _ instead of blanks
    #print(response.summary)
    #print(response.content)
    content_text=wiki_content_text(response.content)
    print(content_text)

# def test_annotations():
#     topic = wikipedia.page('kinetic energy')
#     equations = BeautifulSoup(topic.html(),'lxml').find_all('annotation')
#     print(equations[0].text)
#     text = LatexNodes2Text().latex_to_text(equations[0].text)
#     print(text)

# def test_wiki2pdf():
    url = "https://it.m.wikipedia.org/wiki/Moto_rettilineo"
    output_path = "pagina_di_esempio.pdf"
    Wikipedia2PDF(url, filename=output_path)