import { invoke } from "@tauri-apps/api/core";

enum CellType {
  Empty = 0,
  Wall = 1,
}

window.addEventListener("DOMContentLoaded", () => {
  const serialSelect = document.getElementById('serialSelect') as HTMLSelectElement;
  const openSerial = document.getElementById('openSerial') as HTMLButtonElement;
  const serialIndicator = document.getElementById('serialIndicator') as HTMLDivElement;
  const serialOutput = document.getElementById('serialOutput') as HTMLDivElement;
  const maze = document.getElementById('maze') as HTMLDivElement;
  const sidebar = document.getElementById('sidebar') as HTMLDivElement;
  const mazeContainer = document.getElementById('mazeContainer') as HTMLDivElement;
  const clearOutput = document.getElementById('clearOutput') as HTMLButtonElement;
  const prompt_msg = "选择串口名并开启串口\n右上角是迷宫\t这是串口输出显示栏\n波特率：115200\t数据位：8\n停止位：1\t校验位：无\n";

  let isSerialOpen = false;
  let shipPosition = { x: 0, y: 0 };
  let availablePorts: string[] = [];

  // 初始化迷宫
  const mazeData: CellType[][] = [
    [CellType.Empty, CellType.Wall, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Wall, CellType.Empty],
    [CellType.Empty, CellType.Wall, CellType.Empty, CellType.Wall, CellType.Empty, CellType.Wall, CellType.Empty],
    [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Wall, CellType.Empty, CellType.Empty, CellType.Empty],
    [CellType.Wall, CellType.Wall, CellType.Empty, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Empty],
    [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
  ];

  function renderMaze() {
    maze.innerHTML = '';
    mazeData.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const div = document.createElement('div');
        if (rowIndex === shipPosition.x && colIndex === shipPosition.y) {
          const ship = document.createElement('div');
          ship.className = 'ship';
          const shipInner = document.createElement('div');
          ship.appendChild(shipInner);
          div.appendChild(ship);
        } else {
          div.className = cell === CellType.Wall ? 'wall' : 'empty';
        }
        maze.appendChild(div);
      });
    });
  }

  renderMaze();

  // 初始化串口输出显示栏
  serialOutput.textContent = prompt_msg;

  // 获取可用串口列表
  async function fetchSerialPorts() {
    const ports: string[] = await invoke('get_serial_ports');
    if (JSON.stringify(ports) !== JSON.stringify(availablePorts)) {
      availablePorts = ports;
      serialSelect.innerHTML = '';
      if (ports.length === 0) {
        openSerial.disabled = true;
      } else {
        openSerial.disabled = false;
        ports.forEach(port => {
          const option = document.createElement('option');
          option.value = port;
          option.textContent = port;
          serialSelect.appendChild(option);
        });
      }
    }
  }

  fetchSerialPorts();

  // 定期检查串口列表
  setInterval(fetchSerialPorts, 500);

  // 打开/关闭串口
  openSerial.addEventListener('click', async () => {
    const port = serialSelect.value;
    if (!isSerialOpen) {
      const response = await invoke<boolean>('open_serial', { portName: port });
      if (response) {
        serialIndicator.style.backgroundColor = 'green';
        openSerial.textContent = '关闭串口';
        serialSelect.disabled = true;
        isSerialOpen = true;
      }
    } else {
      const response = await invoke<boolean>('close_serial');
      if (response) {
        serialIndicator.style.backgroundColor = 'gray';
        openSerial.textContent = '打开串口';
        serialSelect.disabled = false;
        isSerialOpen = false;
      }
    }
  });

  clearOutput.addEventListener('click', () => {
    serialOutput.textContent = prompt_msg;
  });

  // 接收串口数据
  async function receiveSerialData() {
    while (true) {
      if (isSerialOpen) {
        try {
          const data: string = await invoke('get_serial_data');
          serialOutput.textContent += data;
          serialOutput.scrollTop = serialOutput.scrollHeight;

          // 处理串口输入
          const commands = data.trim().toLowerCase().split(/\s+/);
          commands.forEach(command => {
            switch (command) {
              case 'up':
                if (shipPosition.x > 0 && mazeData[shipPosition.x - 1][shipPosition.y] !== CellType.Wall) {
                  shipPosition.x -= 1;
                }
                break;
              case 'down':
                if (shipPosition.x < mazeData.length - 1 && mazeData[shipPosition.x + 1][shipPosition.y] !== CellType.Wall) {
                  shipPosition.x += 1;
                }
                break;
              case 'left':
                if (shipPosition.y > 0 && mazeData[shipPosition.x][shipPosition.y - 1] !== CellType.Wall) {
                  shipPosition.y -= 1;
                }
                break;
              case 'right':
                if (shipPosition.y < mazeData[0].length - 1 && mazeData[shipPosition.x][shipPosition.y + 1] !== CellType.Wall) {
                  shipPosition.y += 1;
                }
                break;
            }
          });

          // 重新渲染迷宫
          renderMaze();
        } catch (error) {
          console.error("Failed to get serial data:", error);
          if (error === "Port disconnected") {
            // 关闭串口并刷新串口选择栏
            isSerialOpen = false;
            serialIndicator.style.backgroundColor = 'gray';
            openSerial.textContent = '打开串口';
            serialSelect.disabled = false;
            await fetchSerialPorts();
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  receiveSerialData();

  // 调整迷宫位置
  function adjustMazePosition() {
    const sidebarWidth = sidebar.offsetWidth;
    const outputHeight = serialOutput.offsetHeight;
    mazeContainer.style.marginLeft = `${sidebarWidth}px`;
    mazeContainer.style.marginBottom = `${outputHeight}px`;
  }

  // 监听窗口大小变化
  window.addEventListener('resize', adjustMazePosition);
  sidebar.addEventListener('resize', adjustMazePosition);
  serialOutput.addEventListener('resize', adjustMazePosition);

  // 初始调整迷宫位置
  adjustMazePosition();

  // 监听窗口关闭事件
  window.addEventListener('beforeunload', async () => {
    if (isSerialOpen) {
      await invoke('close_serial');
    }
  });
});