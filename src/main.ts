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

  let isSerialOpen = false;
  let shipPosition = { x: 0, y: 0 };

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
  serialOutput.textContent = "选择串口名并开启串口\n右上角是迷宫\n这是串口输出显示栏\n";

  // 获取可用串口列表
  async function fetchSerialPorts() {
    const ports: string[] = await invoke('get_serial_ports');
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

  fetchSerialPorts();

  // 打开/关闭串口
  openSerial.addEventListener('click', async () => {
    const port = serialSelect.value;
    if (!isSerialOpen) {
      const response = await invoke('open_serial', { port });
      if (response) {
        serialIndicator.style.backgroundColor = 'green';
        openSerial.textContent = '关闭串口';
        serialSelect.disabled = true;
        isSerialOpen = true;
      }
    } else {
      const response = await invoke('close_serial', { port });
      if (response) {
        serialIndicator.style.backgroundColor = 'gray';
        openSerial.textContent = '打开串口';
        serialSelect.disabled = false;
        isSerialOpen = false;
      }
    }
  });

  // 接收串口数据
  async function receiveSerialData() {
    while (true) {
      const data: string = await invoke('get_serial_data');
      serialOutput.textContent += data;
      serialOutput.scrollTop = serialOutput.scrollHeight;
      await new Promise(resolve => setTimeout(resolve, 2000));
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
});