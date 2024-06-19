const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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
    let disposable = vscode.commands.registerCommand('extension.openAIAnalyzer', async () => {
        const panel = vscode.window.createWebviewPanel(
            'aiCodeAnalyzer',
            'AI Code Analyzer',
            vscode.ViewColumn.One,
            { enableScripts: true }
			
        );
		console.log('open ai analized');
		vscode.window.showWarningMessage('open ai api not available')

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
                    const fileContents = await getFileContents(filesToAnalyze);
					console.log({'file content':fileContents});
                    const result = await sendToAIAPI(fileContents, query);
                    panel.webview.postMessage({ command: 'result', result: result });
                }
            });
        }
    });

    context.subscriptions.push(disposable);
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
    for (const file of files) {
        contents[file] = await fs.promises.readFile(file, 'utf-8');
    }
    return contents;
}


async function sendToAIAPI(fileContents, query) {
    const apiKey = Gemin_keys;
    const apiUrl = 'https://api.gemini.ai/analyze'; // Replace with the actual API URL

    const response = await axios.post(apiUrl, {
        query: query,
        files: fileContents
    }, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });

    return response.data;
}


// const { GoogleGenerativeAI } = require("@google/generative-ai");

// // Access your API key as an environment variable (see "Set up your API key" above)
// const genAI = new GoogleGenerativeAI(Gemin_keys);



// // The Gemini 1.5 models are versatile and work with both text-only and multimodal prompts
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});



// async function run() {
//   const prompt = "whats the difference between codding and programming."

//   const result = await model.generateContent(prompt);
//   const response = await result.response;
//   const text = response.text();
//   console.log(text);
// }

// run();



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
			<style>
		body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                }
                h1 {
                    color: #007acc;
                }
                ul {
                    list-style-type: none;
                    padding-left: 20px;
                }
                .directory-name {
                    cursor: pointer;
                }
                .directory-content {
                    display: none;
                    padding-left: 20px;
                }
                .directory.open > .directory-content {
                    display: block;
                }
                input[type="checkbox"] {
                    margin-right: 10px;
                    transform: scale(1.2);
                }
                #file-select {
                    width: 100%;
                    margin-top: 20px;
                    padding: 10px;
                }
                #query {
                    width: 100%;
                    margin-top: 10px;
                    padding: 10px;
                }
                #analyze {
                    display: block;
                    margin-top: 20px;
                    padding: 10px 20px;
                    background-color: #007acc;
                    color: white;
                    border: none;
                    cursor: pointer;
                }
                #analyze:hover {
                    background-color: #005b99;
                }
                #result {
                    margin-top: 20px;
                    white-space: pre-wrap;
                    background-color: #f4f4f4;
                    padding: 10px;
                    border: 1px solid #ddd;
                }
			</style>
		</head>
        <body>
            <h1>AI Code Analyzer</h1>
            <div id="file-structure">
                ${fileStructureHTML}
            </div>
            <select id="file-select" multiple></select>
            <textarea id="query" rows="4" cols="50" placeholder="Enter your query..."></textarea>
            <button id="analyze">Analyze</button>
            <pre id="result"></pre>

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
                        document.getElementById('result').textContent = message.result;
                    }
                });
            </script>
        </body>
        </html>
    `;
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
    activate,
    deactivate
};
