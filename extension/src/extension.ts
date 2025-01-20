import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

// Глобальная переменная: ссылка на запущенный процесс модели.
// Если null, значит модель сейчас не запущена.
let modelProcess: ChildProcess | null = null;

/**
 * Утилита для скачивания файла без прогресса (не используется ниже).
 */
function downloadFileSimple(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download file from ${url}. Status code : ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve());
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => { /* ignore */ });
            reject(err);
        });
    });
}

/**
 * Утилита для скачивания файла с прогресс-баром VS Code.
 */
async function downloadModel(url: string, destPath: string) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Downloading model...',
        cancellable: false
    }, async (progress) => {

        return new Promise<void>((resolve, reject) => {
            const file = fs.createWriteStream(destPath);
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download file from ${url}. Code: ${response.statusCode}`));
                    return;
                }

                const totalSize = parseInt(response.headers['content-length'] ?? '0', 10);
                let downloaded = 0;

                response.on('data', (chunk) => {
                    downloaded += chunk.length;

                    if (totalSize && totalSize > 0) {
                        // Если сервер вернул Content-Length, показываем нормальный %
                        const percentage = (downloaded / totalSize) * 100;
                        progress.report({
                            message: `${percentage.toFixed(1)}%`,
                            increment: (chunk.length / totalSize) * 100
                        });
                    } else {
                        // Иначе — Content-Length неизвестен. Ставим "indeterminate" прогресс
                        progress.report({
                            message: `${(downloaded / 1e6).toFixed(1)} MB downloaded`,
                            increment: -1 // "бегущий" прогресс без конкретного % 
                        });
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close(() => resolve());
                });
            }).on('error', (err) => {
                fs.unlink(destPath, () => {});
                reject(err);
            });
        });
    });
}

/**
 * Запускается при активации расширения.
 */
export async function activate(context: vscode.ExtensionContext) {
    const provider = new LuminaryCodeExtViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'luminaryCodeExtView', 
            provider
        )
    );

    const startCommand = vscode.commands.registerCommand('local-copilot.startModel', startModel);
    const stopCommand = vscode.commands.registerCommand('local-copilot.stopModel', stopModel);

    context.subscriptions.push(startCommand, stopCommand);

    const extensionPath = context.extensionUri.fsPath;
    vscode.window.showInformationMessage(`path ${context.extensionUri.fsPath}`);
    const modelDir = path.join(extensionPath, 'models');

    // !!! Поменяйте название файла под реальное, которое хотите скачать
    const modelFileName = 'codellama-7b.Q4_0.gguf';
    const modelFilePath = path.join(modelDir, modelFileName);

    const MODEL_URL = 'https://huggingface.co/TheBloke/CodeLlama-7B-GGUF/resolve/main/codellama-7b.Q4_0.gguf?download=true';

    if (!fs.existsSync(modelDir)) {
        fs.mkdirSync(modelDir, { recursive: true });
    }

    if (!fs.existsSync(modelFilePath)) {
        vscode.window.showInformationMessage('Модель не найдена. Скачиваем...');
        try {
            await downloadModel(MODEL_URL, modelFilePath);
            vscode.window.showInformationMessage('Модель скачана!');
        } catch (error) {
            vscode.window.showErrorMessage(`Ошибка при скачивании модели: ${error}`);
        }
    } else {
        console.log('Модель уже есть, пропускаем скачивание.');
    }

    // (Не обязательно) - Можно зарегистрировать тестовую команду, типа "runLlamaTest"
    const testCommand = vscode.commands.registerCommand('luminarycodeextension.runLlamaTest', async () => {
        await runLlamaTest(extensionPath);
    });
    context.subscriptions.push(testCommand);
}

export function deactivate() {
    if (modelProcess) {
        modelProcess.kill('SIGINT');
        modelProcess = null;
    }
}

async function startModel(context: vscode.ExtensionContext) {
    if (modelProcess) {
        vscode.window.showInformationMessage('Модель уже запущена!');
        return;
    }

    // Предполагаем, что у нас есть llama-run (или любой бинарник для инференса)
    // const extensionPath = vscode.extensions.getExtension('ВАШ_ID_ИЗ_PACKAGE_JSON')?.extensionUri.fsPath;
    const extensionPath = context.extensionUri.fsPath;
    if (!extensionPath) {
        vscode.window.showErrorMessage('Не удалось определить extensionPath.');
        return;
    }
    vscode.window.showInformationMessage(`path 1 ${context.extensionUri.fsPath}`);
    const llamaBin = path.join(extensionPath, 'bin', 'llama-run');  // поменяйте, если другое имя

    // Путь к модели
    const modelFilePath = path.join(extensionPath, 'models', 'codellama-7b.Q4_0.gguf');

    // Аргументы для запуска модели
    const args = [
        '-m', modelFilePath,
        '-p', 'Hello from CodeLlama!',
        '-n', '32'
        // добавьте нужные опции
    ];

    // Запускаем процесс
    modelProcess = spawn(llamaBin, args);

    // Обработка вывода
    modelProcess?.stdout?.on('data', (data) => {
        const txt = data.toString();
        console.log('[MODEL STDOUT]', txt);
    });

    modelProcess.stderr?.on('data', (data) => {
        console.error('[MODEL STDERR]', data.toString());
    });

    modelProcess.on('close', (code) => {
        vscode.window.showInformationMessage(`Процесс модели завершился (code = ${code})`);
        modelProcess = null;
    });

    vscode.window.showInformationMessage('Модель запущена!');
}

/**
 * Команда "stopModel": останавливает запущенный процесс.
 */
function stopModel() {
    if (!modelProcess) {
        vscode.window.showInformationMessage('Нет запущенной модели!');
        return;
    }

    modelProcess.kill('SIGINT');  // или 'SIGTERM'
    modelProcess = null;
    vscode.window.showInformationMessage('Модель остановлена.');
}

/**
 * Пример команды runLlamaTest – одноразовый запуск (не держит процесс).
 * Можно использовать для отладки.
 */
async function runLlamaTest(extensionPath: string){
    const llamaBin = path.join(extensionPath, 'bin', 'llama-run');
    const modelFilePath = path.join(extensionPath, 'models', 'codellama-7b.Q4_0.gguf');

    const args = [
        '-m', modelFilePath,
        '-p', 'Hello from CodeLlama!',
        '-n', '32'
    ];

    const child = spawn(llamaBin, args);

    let outputData = '';
    child.stdout.on('data', (data) => {
        outputData += data.toString();
    });

    child.stderr.on('data', (data) => {
        console.error(data.toString());
    });

    child.on('close', (code) => {
        vscode.window.showInformationMessage(`Результат: ${outputData}`);
    });
}

/**
 * Провайдер боковой панели (WebviewViewProvider) с кнопками Start/Stop/Reload.
 */
class LuminaryCodeExtViewProvider implements vscode.WebviewViewProvider {
    constructor(private readonly extensionUri: vscode.Uri){}

    public resolveWebviewView(webviewView: vscode.WebviewView) {
        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html = this.getHtmlForWebview();

        // Здесь ловим сообщения из webview (клики по кнопкам)
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'startModel':
                    vscode.commands.executeCommand('local-copilot.startModel');
                    break;
                case 'stopModel':
                    vscode.commands.executeCommand('local-copilot.stopModel');
                    break;
                case 'reloadWindow':
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                    break;
            }
        });
    }

    private getHtmlForWebview(): string {
        return `
          <html>
            <body>
              <h1>Local Copilot Control</h1>
              <button onclick="sendMessage('startModel')">Start Model</button>
              <button onclick="sendMessage('stopModel')">Stop Model</button>
              <button onclick="sendMessage('reloadWindow')">Reload Window</button>
              <script>
                const vscode = acquireVsCodeApi();
                function sendMessage(cmd) {
                  vscode.postMessage({ command: cmd });
                }
              </script>
            </body>
          </html>
        `;
    }
}