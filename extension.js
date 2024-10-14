const vscode = require('vscode');
const fs = require('fs');
const path = require('path');


require("dotenv").config({
  path: path.resolve(__dirname, '.env')
});

const Gemin_keys = process.env.GEMIN_AI_keys;
// console.log('here is keys',Gemin_keys) 


// console.log('im here now')
/**
 * @param {vscode.ExtensionContext} context
 */

function activate(context) {
    vscode.window.registerTreeDataProvider('aiCodeAnalyzerView', new AICodeAnalyzerViewProvider(context));

    let disposable = vscode.commands.registerCommand('extension.openAIAnalyzer', async () => {
        const panel = vscode.window.createWebviewPanel(
            'aiCodeAnalyzer',
            'AI Code Analyzer',
            vscode.ViewColumn.One,
            { enableScripts: true }
			
        );
		console.log('open ai analized');
		vscode.window.showInformationMessage("Welcome to AI code Analyzer")

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            const projectPath = workspaceFolders[0].uri.fsPath;
            console.log(`Project path: ${projectPath}`); // Log project path
			

            const fileStructure = await getFileStructure(projectPath);
            console.log(`File Structure: ${JSON.stringify(fileStructure, null, 2)}`); // Log file structure

            panel.webview.html = getWebviewContent(fileStructure);

            panel.webview.onDidReceiveMessage(async (message) => {
                if (message.command === 'analyze') {
                    const filesToAnalyze = message.files;
                    const query = message.query;
                    const fileContents = await getFileContents(filesToAnalyze);    // the file content has to be mad as an array / json and take only important text and share the data to ai 
					console.log({'file content':fileContents});    
                    const result = await analyzeCodeWithAI(fileContents, query);
                    panel.webview.postMessage({ command: 'result', result: result });
                }
            });
        }
    });

    context.subscriptions.push(disposable);

}


class AICodeAnalyzerViewProvider {
        constructor(context) {
            this._context = context;
        }

        getTreeItem(element) {
            return element;
        }

        getChildren() {
        // Return the root item that triggers the AI Analyzer in tree format 
            const treeItem = new vscode.TreeItem('Open AI Code Analyzer', vscode.TreeItemCollapsibleState.None);
            treeItem.command = {
                command: 'extension.openAIAnalyzer',
                title: 'Open AI Code Analyzer',
                tooltip: 'Click to open AI Code Analyzer'
            };
            // Set the icon path for the tree item
            treeItem.iconPath = {
                light: path.join(__filename, '..', 'media', 'button-icon.svg'), // Light theme icon
                dark: path.join(__filename, '..', 'media', 'button-icon.svg')   // Dark theme icon
            };
            return [treeItem];
        }

}



async function getFileStructure(dir) {
    const files = await fs.promises.readdir(dir);
    const structure = [];

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = await fs.promises.stat(fullPath);

        if (stat.isDirectory()) {
            structure.push({ name: file, type: 'directory', children: await getFileStructure(fullPath) });
        } else {
            structure.push({ name: file, type: 'file', path: fullPath });
        }
    }
    return structure;
}



async function getFileContents(files) {
    const contents = {};
    const endMarker = '\n****************************** END OF FILE ************************************';

    for (const file of files) {
        try {
            const content = await fs.promises.readFile(file, 'utf-8');
            contents[file] = content + endMarker;
            
        } catch (err) {
            console.error(`Error reading file ${file}:`, err);
        }

        try {
        // Join all file contents into a single string
        const allContents = Object.values(contents).join('\n\n');
        await fs.promises.writeFile(path.join(__dirname, 'media', 'codes.txt'), allContents, 'utf-8');
        
        } catch (err) {
            console.error('Error writing to codes.txt:', err);
        }

        console.log('content files:',contents);
    }

    return contents;
    
}


async function analyzeCodeWithAI(fileContents, query) {
        const { GoogleGenerativeAI } = require("@google/generative-ai");

        if (!Gemin_keys) {
            console.error("API key is not defined");
            throw new Error("API key is not defined");
        }

        const genAI = new GoogleGenerativeAI(Gemin_keys);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        try {
            const promptText = `Analyze the following code and respond to the query "${query}":\n\n${Object.values(fileContents).join('\n\n')}`;
            const result = await model.generateContent([
                { text: promptText }
            ]);
                
                const candidate = result.response.candidates[0];
                const text = candidate.content.parts[0].text;
                console.log('Extracted text:', text);
                return text;
            // console.log('this is the responce ',result.response.candidates)
                // return result.response.text;
        } catch (error) {
            console.error('Error calling AI API', error.response ? error.response.data : error.message);
            throw error;

        }

    }



function generateFileStructureHTML(structure) {
        let html = '<ul>';
        for (const item of structure) {
            if (item.type === 'directory') {
                html += `

                <li class="directory">📁
                        <span class="directory-name"> ${item.name}</span>
                        <ul class="directory-content">
                            <span> 📄└─ ${generateFileStructureHTML(item.children)}</span>
                        </ul>
                    </li>`;
                
            } else {
                html += `<li class="file">
                
                    <input type="checkbox" value="${item.path}">
                    
                    <span>${item.name}</span>
                
                </li>`;
                // console.log(item.name);
            }
        }
        html += '</ul>';
        return html;
}


function getWebviewContent(fileStructure) {
    const fileStructureHTML = generateFileStructureHTML(fileStructure);

    // console.log(`Generated HTML: ${fileStructureHTML}`); // Log generated HTML

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>AI Code Analyzer</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

            
               

                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        background-color: #121212;
                        color: #e0e0e0;
                    }

                    h1 {
                        color: #007acc;
                        text-shadow: 2px 2px 0 #005b99, 4px 4px 0 #004c7f; /* 3D effect with multiple shadows */
                        margin-bottom: 20px; /* Space between heading and content */
                    }

                    #file-structure {
                        margin: 20px 0; /* Space below file structure */
                    }

                    .directory, .file {
                        margin: 10px 0;
                    }

                    .directory-name, .file-name {
                        cursor: pointer;
                        color: #81d4fa;
                        display: flex;
                        align-items: center;
                    }

                    .directory-name::before {
                        content: '\f07c';
                        font-family: 'Font Awesome 5 Free';
                        margin-right: 10px;
                    }

                    .file-name::before {
                        content: '\f15b';
                        font-family: 'Font Awesome 5 Free';
                        margin-right: 10px;
                    }

                    .directory-content {
                        display: none;
                        padding-left: 20px;
                        border-left: 1px solid #333;
                        margin-left: 10px;
                    }

                    .directory.open > .directory-content {
                        display: block;
                    }

                    input[type="checkbox"] {
                        margin-right: 10px;
                        transform: scale(1.2);
                        accent-color: #80d8ff;
                    }

                    #file-select {
                        width: 100%;
                        margin-top: 20px;
                        padding: 10px;
                        background-color: #1e1e1e;
                        border: 1px solid #333;
                        color: #e0e0e0;
                        border-radius: 5px;
                        visibility:hidden;
                    }

                    #file-select option {
                        background-color: #1e1e1e;
                        color: #e0e0e0;
                    }

                    .textarea-container {
                        position: relative;
                        width: 100%;
                        margin-top: 10px;
                    }

                    #query {
                        width: 96.5%;
                        padding: 10px;
                        background-color: #1e1e1e;
                        border: 1px solid #333;
                        color: #e0e0e0;
                        border-radius: 5px;
                        padding-right: 60px; /* Adjust padding to make space for the button */
                        resize: vertical; /* Allow vertical resizing */
                        min-height: 100px; /* Minimum height to show multiple lines */
                    }

                    #analyze {
                        position: absolute;
                        right: 10px;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 40px;
                        height: 40px;
                        background-color: #007acc;
                        color: white;
                        border: none;
                        border-radius: 50%;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    #analyze:hover {
                        background-color: #005b99;
                    }

                    #analyze i {
                        font-size: 18px;
                    }

                    #result {
                        margin-top: 20px;
                        white-space: pre-wrap;
                        background-color: #1e1e1e;
                        padding: 10px;
                        border: 1px solid #333;
                        color: #e0e0e0;
                        border-radius: 5px;
                    }

                    #result-container {
                        margin-top: 20px;
                        padding: 20px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        background-color: #2F2F2F;

                    }
                    #analyze:hover {
                        background-color: #005b99;
                    }

                    .response-block {
                        margin-bottom: 15px;
                        padding: 10px;
                        border: 1px solid #ccc;
                        border-radius: 5px;
                        background-color: #2F2F2F;
                    }

                    .response-block p {
                        margin: 0;
                        padding: 0;
                    }

                    .response-header {
                        font-weight: bold;
                        margin-bottom: 9px;
                    }

                    p {
                        white-space: pre-wrap;
                        color: #e0e0e0;
                    }


                    pre {
                        background-color: #1e1e1e;
                        color: #e0e0e0;
                        padding: 10px;
                        border-radius: 5px;
                        overflow-x: auto;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }

                    /* Media Queries for responsiveness */
                    @media (max-width: 1080px) {
                        #query {
                            padding-right: 50px; /* Adjust padding for smaller screen */
                            width: 96.5%;
                        }
                        #analyze {
                            width: 35px;
                            height: 35px;
                            right: 5px; /* Adjust position for smaller screen */
                        }
                        #analyze i {
                            font-size: 16px;
                        }
                    }

                    @media (max-width: 768px) {
                        body {
                            padding: 10px;
                        }
                        h1 {
                            font-size: 24px;
                        }
                        #file-select, #query {
                            font-size: 14px;
                        }
                        #analyze {
                            width: 35px;
                            height: 35px;
                        }
                        #analyze i {
                            font-size: 16px;
                        }
                    }

                    @media (max-width: 480px) {
                        h1 {
                            font-size: 20px;
                        }
                        #file-select, #query {
                            font-size: 12px;
                        }
                        #analyze {
                            width: 30px;
                            height: 30px;
                        }
                        #analyze i {
                            font-size: 14px;
                        }
                    }

                </style>

               

            </head>
         <body>
    <h1>AI Code Analyzer</h1>
    <div id="file-structure">
        ${fileStructureHTML}
    </div>
    <select id="file-select" multiple></select>
    <div class="textarea-container">
        <textarea id="query" rows="4" cols="50" placeholder="Enter your query..."></textarea>
        <button id="analyze"><i class="fas fa-brain"></i></button>
    </div>

    <div id="result-container"></div>
    
    <script>
        document.querySelectorAll('.directory-name').forEach(dir => {
            dir.addEventListener('click', () => {
                dir.parentElement.classList.toggle('open');
            });
        });

        const vscode = acquireVsCodeApi();
        document.getElementById('analyze').addEventListener('click', () => {
            const selectedFiles = Array.from(document.querySelectorAll('#file-structure input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
            const query = document.getElementById('query').value;
            vscode.postMessage({ command: 'analyze', files: selectedFiles, query: query });
        });

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'result') {
                const resultContainer = document.getElementById('result-container');
                resultContainer.innerHTML = '';  // Clear previous results

                const responseBlock = document.createElement('div');
                responseBlock.className = 'response-block';

                const responseHeader = document.createElement('div');
                responseHeader.className = 'response-header';
                responseHeader.textContent = 'AI Response:';
                responseBlock.appendChild(responseHeader);

                const responseContent = document.createElement('p');
                responseBlock.appendChild(responseContent);

                resultContainer.appendChild(responseBlock);

                const text = message.result;
                let i = 0;
                const speed = 50;

                function typeWriter() {
                    if (i < text.length) {
                        responseContent.textContent += text.charAt(i);
                        i++;
                        setTimeout(typeWriter, speed);
                    }
                }

                typeWriter();
            }
        });
    </script>
</body>
            </html>`;
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
