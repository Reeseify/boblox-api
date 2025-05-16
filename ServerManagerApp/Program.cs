using System;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Windows.Forms;
using System.Drawing;

namespace APIServerManager
{
    public class MainForm : Form
    {
        private Button startButton, stopButton, refreshButton;
        private ComboBox dbDropdown;
        private TreeView jsonTree;
        private TextBox logBox;

        private Process serverProcess;
        private string serverPath = @"E:\API\index.js";
        private string databaseFolder = @"E:\Databases";

        public MainForm()
        {
            Text = "🖤 API Server Manager (Dark Mode)";
            Width = 1000;
            Height = 700;
            BackColor = Color.FromArgb(30, 30, 30);
            ForeColor = Color.White;
            Font = new Font("Segoe UI", 9);

            startButton = MakeButton("Start Server", 20, 20);
            stopButton = MakeButton("Stop Server", 150, 20);
            refreshButton = MakeButton("↻ Refresh", 280, 20);

            startButton.Anchor = AnchorStyles.Top | AnchorStyles.Left;
            stopButton.Anchor = AnchorStyles.Top | AnchorStyles.Left;
            refreshButton.Anchor = AnchorStyles.Top | AnchorStyles.Left;

            dbDropdown = new ComboBox
            {
                Left = 20,
                Top = 60,
                Width = 380,
                DropDownStyle = ComboBoxStyle.DropDownList,
                BackColor = Color.FromArgb(45, 45, 45),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right
            };

            jsonTree = new TreeView
            {
                Left = 20,
                Top = 100,
                Width = 940,
                Height = 400,
                Font = new Font("Consolas", 10),
                BorderStyle = BorderStyle.FixedSingle,
                BackColor = Color.FromArgb(40, 40, 40),
                ForeColor = Color.White,
                LineColor = Color.LightGray,
                Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right
            };

            logBox = new TextBox
            {
                Left = 20,
                Top = 520,
                Width = 940,
                Height = 120,
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(40, 40, 40),
                ForeColor = Color.White,
                Font = new Font("Consolas", 9),
                Anchor = AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right
            };

            startButton.Click += StartServer;
            stopButton.Click += StopServer;
            refreshButton.Click += (s, e) => LoadDatabaseFiles();
            dbDropdown.SelectedIndexChanged += LoadJsonIntoTree;
            jsonTree.NodeMouseDoubleClick += JsonTree_NodeMouseDoubleClick;
            jsonTree.NodeMouseClick += JsonTree_NodeMouseClick;

            Controls.Add(startButton);
            Controls.Add(stopButton);
            Controls.Add(refreshButton);
            Controls.Add(dbDropdown);
            Controls.Add(jsonTree);
            Controls.Add(logBox);

            LoadDatabaseFiles();
        }

        private int GetAvailablePort()
        {
            var listener = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Loopback, 0);
            listener.Start();
            int port = ((System.Net.IPEndPoint)listener.LocalEndpoint).Port;
            listener.Stop();
            return port;
        }

        private async void PrintPublicAddress(int port)
        {
            try
            {
                using var http = new HttpClient();
                string ip = await http.GetStringAsync("https://api.ipify.org");
                string url = $"http://{ip.Trim()}:{port}";
                AppendLog($"🌍 Public Address: {url}");
            }
            catch (Exception ex)
            {
                AppendLog($"⚠️ Failed to fetch public IP: {ex.Message}");
            }
        }


        private Button MakeButton(string text, int x, int y)
        {
            return new Button
            {
                Text = text,
                Left = x,
                Top = y,
                Width = 120,
                BackColor = Color.FromArgb(60, 60, 60),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
        }

        private void TryForwardPort(int port)
        {
            try
            {
                var forward = new Process();
                forward.StartInfo.FileName = "cmd.exe";
                forward.StartInfo.Arguments = $"/C code tunnel forward-port {port}";
                forward.StartInfo.CreateNoWindow = true;
                forward.StartInfo.UseShellExecute = false;
                forward.Start();
                AppendLog($"🌐 Attempting to forward port {port} with VS Code...");
            }
            catch (Exception ex)
            {
                AppendLog("🧭 If you're in a remote container or SSH session:");
                AppendLog("👉 Use the PORTS tab in VS Code to manually forward the port.");
                AppendLog("📌 Port: " + port);
                AppendLog("💥 " + ex.Message);
            }
        }



        private int currentPort = -1;

        private void StartServer(object sender, EventArgs e)
        {
            if (serverProcess == null || serverProcess.HasExited)
            {
                currentPort = GetAvailablePort();

                serverProcess = new Process();
                serverProcess.StartInfo.FileName = "node";
                serverProcess.StartInfo.Arguments = $"\"{serverPath}\" {currentPort}"; // <-- pass the port
                serverProcess.StartInfo.UseShellExecute = false;
                serverProcess.StartInfo.RedirectStandardOutput = true;
                serverProcess.StartInfo.RedirectStandardError = true;
                serverProcess.StartInfo.CreateNoWindow = true;

                serverProcess.OutputDataReceived += (s, args) => AppendLog(args.Data);
                serverProcess.ErrorDataReceived += (s, args) => AppendLog("[ERROR] " + args.Data);

                serverProcess.Start();
                serverProcess.BeginOutputReadLine();
                serverProcess.BeginErrorReadLine();

                AppendLog($"✅ Server started on port {currentPort}");
                TryForwardPort(currentPort);
                PrintPublicAddress(currentPort);
            }
            else
            {
                AppendLog("⚠️ Server is already running.");
            }
        }

        private void StopServer(object sender, EventArgs e)
        {
            if (serverProcess != null && !serverProcess.HasExited)
            {
                AppendLog("🛑 Attempting to stop server...");
                System.Threading.Tasks.Task.Run(() =>
                {
                    try
                    {
                        serverProcess.Kill();
                        if (!serverProcess.WaitForExit(3000))
                        {
                            AppendLog("⚠️ Server did not exit in time.");
                        }
                        else
                        {
                            AppendLog("✅ Server stopped.");
                        }
                    }
                    catch (Exception ex)
                    {
                        AppendLog("❌ Error stopping server: " + ex.Message);
                    }
                });
            }
            else
            {
                AppendLog("ℹ️ Server is not running.");
            }
        }

        private void AppendLog(string message)
        {
            if (InvokeRequired)
            {
                Invoke(new Action<string>(AppendLog), message);
                return;
            }

            if (!string.IsNullOrWhiteSpace(message))
            {
                logBox.AppendText(message + Environment.NewLine);
            }
        }

        private void LoadDatabaseFiles()
        {
            dbDropdown.Items.Clear();
            if (Directory.Exists(databaseFolder))
            {
                var files = Directory.GetFiles(databaseFolder, "*.json");
                foreach (var file in files)
                {
                    dbDropdown.Items.Add(Path.GetFileName(file));
                }

                if (dbDropdown.Items.Count > 0)
                    dbDropdown.SelectedIndex = 0;
            }
        }

        private void LoadJsonIntoTree(object sender, EventArgs e)
        {
            jsonTree.Nodes.Clear();

            var selectedFile = dbDropdown.SelectedItem?.ToString();
            if (selectedFile == null) return;

            string fullPath = Path.Combine(databaseFolder, selectedFile);
            if (!File.Exists(fullPath)) return;

            try
            {
                string rawJson = File.ReadAllText(fullPath);
                JsonElement json = JsonSerializer.Deserialize<JsonElement>(rawJson);

                var rootNode = new TreeNode(selectedFile);
                BuildTreeFromJson(json, rootNode);
                jsonTree.Nodes.Add(rootNode);
                jsonTree.CollapseAll();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error loading JSON: " + ex.Message);
            }
        }

        private void BuildTreeFromJson(JsonElement json, TreeNode parent)
        {
            switch (json.ValueKind)
            {
                case JsonValueKind.Object:
                    foreach (var prop in json.EnumerateObject())
                    {
                        var node = new TreeNode(prop.Name);
                        BuildTreeFromJson(prop.Value, node);
                        parent.Nodes.Add(node);
                    }
                    break;

                case JsonValueKind.Array:
                    int i = 0;
                    foreach (var element in json.EnumerateArray())
                    {
                        var node = new TreeNode($"[{i++}]");
                        BuildTreeFromJson(element, node);
                        parent.Nodes.Add(node);
                    }
                    break;

                case JsonValueKind.String:
                    var strNode = new TreeNode($"{parent.Text}: \"{json.GetString()}\"")
                    {
                        ForeColor = Color.White,
                        Tag = JsonValueKind.String
                    };
                    parent.Nodes.Add(strNode);
                    break;

                case JsonValueKind.Number:
                    var numNode = new TreeNode($"{parent.Text}: {json}")
                    {
                        ForeColor = Color.MediumPurple,
                        Tag = JsonValueKind.Number
                    };
                    parent.Nodes.Add(numNode);
                    break;

                case JsonValueKind.True:
                case JsonValueKind.False:
                    var boolNode = new TreeNode($"{parent.Text}: {json}")
                    {
                        ForeColor = Color.Goldenrod,
                        Tag = json.ValueKind
                    };
                    parent.Nodes.Add(boolNode);
                    break;

                default:
                    var defaultNode = new TreeNode($"{parent.Text}: {json}")
                    {
                        ForeColor = Color.Gray
                    };
                    parent.Nodes.Add(defaultNode);
                    break;
            }
        }

        private void JsonTree_NodeMouseClick(object sender, TreeNodeMouseClickEventArgs e)
        {
            if (e.Button == MouseButtons.Right)
            {
                jsonTree.SelectedNode = e.Node;

                if (e.Node.Tag is JsonValueKind kind &&
                    (kind == JsonValueKind.String || kind == JsonValueKind.Number || kind == JsonValueKind.True || kind == JsonValueKind.False))
                {
                    ContextMenuStrip menu = new ContextMenuStrip();

                    // Edit
                    var edit = new ToolStripMenuItem("✏️ Edit Value");
                    edit.Click += (s, ev) => EditTreeNodeValue(e.Node);
                    menu.Items.Add(edit);

                    // Copy
                    var copy = new ToolStripMenuItem("📋 Copy Value");
                    copy.Click += (s, ev) =>
                    {
                        Clipboard.SetText(ExtractNodeValue(e.Node.Text));
                    };
                    menu.Items.Add(copy);

                    // Paste
                    var paste = new ToolStripMenuItem("📥 Paste Value");
                    paste.Click += (s, ev) =>
                    {
                        string clipboard = Clipboard.GetText();
                        if (!string.IsNullOrEmpty(clipboard))
                        {
                            e.Node.Text = FormatJsonValue(GetNodeKey(e.Node.Text), clipboard, kind);
                        }
                    };
                    menu.Items.Add(paste);

                    // Clear
                    var clear = new ToolStripMenuItem("🧹 Clear Value");
                    clear.Click += (s, ev) =>
                    {
                        string newVal = kind switch
                        {
                            JsonValueKind.String => "",
                            JsonValueKind.Number => "0",
                            JsonValueKind.True => "false",
                            JsonValueKind.False => "false",
                            _ => ""
                        };

                        e.Node.Text = FormatJsonValue(GetNodeKey(e.Node.Text), newVal, kind);
                    };
                    menu.Items.Add(clear);

                    menu.Show(jsonTree, e.Location);
                }
            }
        }


        private void JsonTree_NodeMouseDoubleClick(object sender, TreeNodeMouseClickEventArgs e)
        {
            if (e.Node != null)
            {
                EditTreeNodeValue(e.Node);
            }
        }

        private void EditTreeNodeValue(TreeNode node)
        {
            if (node.Tag is JsonValueKind kind &&
                (kind == JsonValueKind.String || kind == JsonValueKind.Number || kind == JsonValueKind.True || kind == JsonValueKind.False))
            {
                string oldValue = ExtractNodeValue(node.Text);
                string input = Microsoft.VisualBasic.Interaction.InputBox("Edit Value:", "Edit JSON Value", oldValue);
                if (input != "")
                {
                    node.Text = FormatJsonValue(GetNodeKey(node.Text), input, kind);
                }
            }
        }

        private string ExtractNodeValue(string fullText)
        {
            int index = fullText.IndexOf(':');
            if (index >= 0)
                return fullText.Substring(index + 1).Trim().Trim('"');
            return fullText.Trim().Trim('"');
        }

        private string GetNodeKey(string fullText)
        {
            int index = fullText.IndexOf(':');
            return index >= 0 ? fullText.Substring(0, index).Trim() : fullText.Trim();
        }

        private string FormatJsonValue(string key, string value, JsonValueKind kind)
        {
            switch (kind)
            {
                case JsonValueKind.String: return $"{key}: \"{value}\"";
                case JsonValueKind.True:
                case JsonValueKind.False: return $"{key}: {value.ToLower()}";
                case JsonValueKind.Number: return $"{key}: {value}";
                default: return $"{key}: {value}";
            }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.Run(new MainForm());
        }
    }
}
