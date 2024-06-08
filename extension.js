const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

console.log('im here now')
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
    const apiKey = 'YOUR_API_KEY';
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

function generateFileStructureHTML(structure) {
    let html = '<ul>';
    for (const item of structure) {
        if (item.type === 'directory') {
            html += `<li>📁
							${item.name}
						<ul> 📄 
							${generateFileStructureHTML(item.children)}
						</ul>
					</li>`;
        } else {
            html += `<li>
			
				<input type="checkbox" value="${item.path}">
				
				${item.name}
			
			</li>`;
			// console.log(item.name);
        }
    }
    html += '</ul>';
    return html;
}

function getWebviewContent(fileStructure) {
    const fileStructureHTML = generateFileStructureHTML(fileStructure);
    console.log(`Generated HTML: ${fileStructureHTML}`); // Log generated HTML
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
                #file-structure ul {
                    list-style-type: none;
                    padding-left: 20px;
                }
                #file-structure li {
                    margin: 5px 0;
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
            <textarea id="query" rows="4" cols="50" placeholder="Enter your query..."></textarea>
            <button id="analyze">Analyze</button>
            <pre id="result"></pre>

            <script>
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

                console.log('Webview script loaded'); // Log when script loads
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
