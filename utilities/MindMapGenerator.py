import json
from openai import OpenAI
import time

import networkx as nx
from pyvis.network import Network
import matplotlib.pyplot as plt

from io import BytesIO

template_dialogue_en = """You are a helpful assistant that generates a coded Mind Map given a specific [context].
If the [context] contains questions, please ignore them.
Each map has to contain a maximum of 3 concepts and all connections must be labelled.
The output has to be the pyvis python code needed to produce the mind map. This output has to contain only the code needed without any import.
As an example, the output has to start with: 
nt = Network() 
As an example, if the user asks for: 
[context] An atom is the fundamental building block of matter, consisting of two main components: electrons and nucleus. Electrons are negatively charged subatomic particles that orbit the nucleus in specific energy levels or electron shells; the nucleus is the central, densely packed core of an atom, where most of its mass is concentrated and contains two types of particles: protons (positively charged subatomic particles) and neutrons (electrically neutral subatomic particles).

coded mind map:
nt = Network()
nt.add_node("atom", label="atom")
nt.add_node("nucleus", label="nucleus")
nt.add_node("protons", label="protons")
nt.add_node("neutrons", label="neutrons")
nt.add_node("electrons", label="electrons")
nt.add_edge("atom", "nucleus", label="composition")
nt.add_edge("nucleus", "protons", label="compositions")
nt.add_edge("nucleus", "neutrons", label="composition")
nt.add_edge("atom", "electrons", label="composition")
'''
[context]{context}

coded mind map:"""

template_dialogue_it = """Sei un assistente utile che genera una Mappa Concettuale codificata data un determinato [context].
Se il [context] contiene domande, per favore ignorale.
Ogni mappa deve contenere un massimo di 3 concetti e tutte le connessioni devono essere etichettate.
L'output deve essere il codice pyvis python necessario per produrre la mappa concettuale. 
Questo output deve contenere solo il codice necessario senza alcun import.
Come esempio, l'output deve iniziare con:
nt = Network() 
Come esempio, se l'utente chiede:
[context] Un atomo è l'unità fondamentale della materia, composta da due componenti principali: gli elettroni e il nucleo. Gli elettroni sono particelle subatomiche con carica negativa che orbitano intorno al nucleo in livelli energetici specifici o gusci elettronici; il nucleo è il nucleo centrale densamente concentrato di un atomo, dove si trova la maggior parte della sua massa ed è costituito da due tipi di particelle: protoni (particelle subatomiche con carica positiva) e neutroni (particelle subatomiche elettricamente neutre).

coded mind map:
nt = Network()
nt.add_node("atomp", label="atomo")
nt.add_node("nucleo", label="nucleo")
nt.add_node("protoni", label="protoni")
nt.add_node("neutroni", label="neutroni")
nt.add_node("electroni", label="electroni")
nt.add_edge("atomo", "nucleo", label="composizione")
nt.add_edge("nucleo", "protoni", label="composizione")
nt.add_edge("nucleo", "neutroni", label="composizione")
nt.add_edge("atomo", "electroni", label="composizione")
[context]{context}

coded mind map:"""

template_context_en = """You are a helpful assistant that generates a coded Mind Map given a specific [context].
Each map has to contain most usefull concepts and all connections must be labelled.
The output has to be the pyvis python code needed to produce the mind map. This output has to contain only the code needed without any import.
As an example, the output has to start with: 
nt = Network()
As an example, if the user asks for: 
[context] An atom is the fundamental building block of matter, consisting of two main components: electrons and nucleus. Electrons are negatively charged subatomic particles that orbit the nucleus in specific energy levels or electron shells; the nucleus is the central, densely packed core of an atom, where most of its mass is concentrated and contains two types of particles: protons (positively charged subatomic particles) and neutrons (electrically neutral subatomic particles).

coded mind map:
nt = Network()
nt.add_node("atom", label="atom")
nt.add_node("nucleus", label="nucleus")
nt.add_node("protons", label="protons")
nt.add_node("neutrons", label="neutrons")
nt.add_node("electrons", label="electrons")
nt.add_edge("atom", "nucleus", label="composition")
nt.add_edge("nucleus", "protons", label="compositions")
nt.add_edge("nucleus", "neutrons", label="composition")
nt.add_edge("atom", "electrons", label="composition")'''
[context]{context}

coded mind map:"""

template_context_it = """Sei un assistente utile che genera una Mappa Concettuale codificata data un determinato [context].
Ogni mappa deve contenere i concetti principali e tutte le connessioni devono essere etichettate.
L'output deve essere il codice pyvis python necessario per produrre la mappa concettuale. 
Questo output deve contenere solo il codice necessario senza alcun import.
Come esempio, l'output deve iniziare con:
nt = Network()
Come esempio, se l'utente chiede:
[context] Un atomo è l'unità fondamentale della materia, composta da due componenti principali: gli elettroni e il nucleo. Gli elettroni sono particelle subatomiche con carica negativa che orbitano intorno al nucleo in livelli energetici specifici o gusci elettronici; il nucleo è il nucleo centrale densamente concentrato di un atomo, dove si trova la maggior parte della sua massa ed è costituito da due tipi di particelle: protoni (particelle subatomiche con carica positiva) e neutroni (particelle subatomiche elettricamente neutre).

coded mind map:
nt = Network()
nt.add_node("atomp", label="atomo")
nt.add_node("nucleo", label="nucleo")
nt.add_node("protoni", label="protoni")
nt.add_node("neutroni", label="neutroni")
nt.add_node("electroni", label="electroni")
nt.add_edge("atomo", "nucleo", label="composizione")
nt.add_edge("nucleo", "protoni", label="composizione")
nt.add_edge("nucleo", "neutroni", label="composizione")
nt.add_edge("atomo", "electroni", label="composizione")'''
[context]{context}

coded mind map:"""

mm_js_code = """
<script type="text/javascript">
  function handleDoubleClick(nodeId) {
    //alert("Double-clicked on Node " + nodeId);
  }
</script>
"""

network_on_old="""network = new vis.Network(container, data, options);"""

network_on="""
network = new vis.Network(container, data, options);
network.on("doubleClick", function(event) {
  var nodeId = event.nodes[0];
  if (nodeId) {
    handleDoubleClick(nodeId);
    window.parent.postMessage(nodeId, "*");
  }
});
"""

def generateMindMap(language,type,text,temperature=0,model_name='gpt-4-0613'):

    #print(model_name)
    if language=='italian':
        if type=='small':
            template=template_dialogue_it
        else:
            template=template_context_it
    else:
        if type=='small':
            template=template_dialogue_en
        else:
            template=template_context_en

    messages=[]
    messages.append(
        {
        "role": "system",
        "content": template
        }
    )

    user_content="{context} "+text;
    messages.append(
        {
            "role":"user",
            "content": user_content
        }
    )

    #print(messages)

    client=OpenAI()
    
    response = client.chat.completions.create(
        model=model_name,
        messages=messages,
        temperature=0,
        max_tokens=2000,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0
    )
    answer=response.choices[0].message.content

    timestamp = int(time.time())
    last2 = timestamp % 100
    suffix = str(last2)

    #print(answer)
    
    exec(answer)
    image_bytes_io = BytesIO()
    plt.savefig(image_bytes_io, format="png")
    image_bytes_io.seek(0)
    image_content = image_bytes_io.read()
    image_bytes_io.close()

    return image_content

    # file_name=name+"_"+suffix+".png"
    # answer=answer+"\nfigure.savefig(\""+file_name+"\")"

    # answer = answer.replace("figure", "fig" + suffix)\
    #     .replace("axx", "ax" + suffix)
    
    #print(answer)
    #exec(answer)

    #return file_name  

def set_linear_edges(input_string):
    lines = input_string.split("\n")
    output_lines = []

    for line in lines:
        if "add_edge" in line:
            line = line.rstrip().replace(')', ', smooth={"type": "continuous", "enabled": False})')
        output_lines.append(line)

    output_string = "\n".join(output_lines)
    return output_string

def generateInteractiveMindMap(
    language,
    type,
    text,
    physics,
    temperature=0,
    model_name='gpt-4-0613'):

    #print(model_name)
    if language=='italian':
        if type=='small':
            template=template_dialogue_it
        else:
            template=template_context_it
    else:
        if type=='small':
            template=template_dialogue_en
        else:
            template=template_context_en

    messages=[]
    messages.append(
        {
        "role": "system",
        "content": template
        }
    )

    user_content="{context} "+text;
    messages.append(
        {
            "role":"user",
            "content": user_content
        }
    )

    #print(messages)

    client=OpenAI()
    
    response = client.chat.completions.create(
        model=model_name,
        messages=messages,
        temperature=0,
        max_tokens=2000,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0
    )
    answer=response.choices[0].message.content
    if physics==False:
        answer=set_linear_edges(answer)
    #print(answer)
    local_vars = {}
    exec(answer, globals(), local_vars)
    local_vars['nt'].toggle_physics(physics)
    
    #networkx_generator(local_vars['nt'])

    return local_vars['nt']


import networkx as nx
import matplotlib.pyplot as plt

def pyvis_to_json(nt):
    nodes=nt.get_nodes()
    edges=nt.get_edges()

    data = {
        "nodes": nodes,
        "labels": edges
    }
    json_string = json.dumps(data)
    #print(json_string)
    
    return json_string

def json_to_pyvis(json_string):
    data = json.loads(json_string)

    nt = Network()
    for node in data["nodes"]:
        nt.add_node(node)
    for edge in data["labels"]:
        nt.add_edge(edge["from"], edge["to"], label=edge["label"])

    #nt.show("nx.html",notebook=False)
    return nt

def pyvis_to_networkx(nt):
    nodes=nt.get_nodes()
    edges=nt.get_edges()

    nx_graph = nx.Graph()
    nodes = nt.get_nodes()
    for node in nodes:
        nx_graph.add_node(node)
        
    edges = nt.get_edges()
    for edge in edges:
        from_node = edge['from']
        to_node = edge['to']
        label = edge['label']
        nx_graph.add_edge(from_node, to_node, label=label)

    # layout = nx.spring_layout(nx_graph)
    # nx.draw(nx_graph, pos=layout, with_labels=True, node_color='skyblue', edge_color='gray')
    # edge_labels = nx.get_edge_attributes(nx_graph, 'label')
    # nx.draw_networkx_edge_labels(nx_graph, pos=layout, edge_labels=edge_labels, font_size=8, label_pos=0.5, font_color='black')
    # #plt.savefig('network.png', format='png', dpi=300)

    return nx_graph

def json_to_image(json_string):
    try:
        nt = json_to_pyvis(json_string)
        nx_graph = pyvis_to_networkx(nt)

        layout = nx.spring_layout(nx_graph)
        nx.draw(nx_graph, pos=layout, with_labels=True, node_color='skyblue', edge_color='gray')
        edge_labels = nx.get_edge_attributes(nx_graph, 'label')
        nx.draw_networkx_edge_labels(nx_graph, pos=layout, edge_labels=edge_labels, font_size=8, label_pos=0.5, font_color='black')

        image_bytes_io = BytesIO()
        plt.savefig(image_bytes_io, format="png")
        image_bytes_io.seek(0)

        image_content = image_bytes_io.read()
        image_bytes_io.close()

        return image_content
    except Exception as e:
        print("Error generating PNG image:", str(e))
        return None

def networkx_generator(nt):

    nx_graph=pyvis_to_networkx(nt)
    json_string=pyvis_to_json(nt)
    nt=json_to_pyvis(json_string)
