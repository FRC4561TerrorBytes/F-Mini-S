import { useState, useEffect, useCallback } from "react";
import './match.css';

type OpenedScreen = {
  id: number;
  name: string;
};

interface WebSerialPort {
  open: (options: { baudRate: number }) => Promise<void>;
  getInfo: () => { usbVendorId?: number; usbProductId?: number };
  readable: {
    getReader: () => ReadableStreamDefaultReader<Uint8Array>;
  };
  // Explicit inline typing to clear the error completely
  writable: {
    getWriter: () => {
      write: (data: Uint8Array) => Promise<void>;
      releaseLock: () => void;
    };
  };
}

type NavigatorWithSerial = Navigator & {
  serial: {
    getPorts: () => Promise<WebSerialPort[]>;
  };
};

function Match() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [openedScreens, setOpenedScreens] = useState<OpenedScreen[]>([]);
  
  const [systemPorts, setSystemPorts] = useState<WebSerialPort[]>([]);
  const [chosenPortIndex, setChosenPortIndex] = useState<string>('');
  const [chosenPortIndex2, setChosenPortIndex2] = useState<string>('');
  const [isSerialConnected, setIsSerialConnected] = useState<boolean>(false);
  const [isSerialConnected2, setIsSerialConnected2] = useState<boolean>(false);

  const scanHardwarePorts = async () => {
    try {
      const nav = navigator as NavigatorWithSerial;
      if (nav.serial) {
        const ports = await nav.serial.getPorts();
        setSystemPorts(ports);
      }
    } catch (err) {
      console.error("Failed to read ports", err);
    }
  };

  const sendDataToSerial = async (command: string) => {
    if (!systemPorts[parseInt(chosenPortIndex, 10)] || !systemPorts[parseInt(chosenPortIndex, 10)].writable) {
      console.error("Cannot send data");
      return;
    }

    try {
      const writer = systemPorts[parseInt(chosenPortIndex, 10)].writable.getWriter();
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(`${command}\n`);

      await writer.write(encodedData);
      writer.releaseLock();
      
      console.log(`Sent command: ${command}`);
    } catch (err) {
      console.error("Failed to write to port:", err);
    }
  };

  useEffect(() => {
    const shp = async () => {
      await scanHardwarePorts();
    }
    shp();
  }, []);

  const handleConnectHardware = async () => {
    if (chosenPortIndex === "") return;
    
    try {
      const selectedPortIndexNum = parseInt(chosenPortIndex, 10);
      const targetPort = systemPorts[selectedPortIndexNum];

      await targetPort.open({ baudRate: 115200 });
      setIsSerialConnected(true);
      console.log("Connected!");

      const decoder = new TextDecoder();
      const reader = targetPort.readable.getReader();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        lines.forEach(line => {
          if (line.trim() === 'EVT:BALL') {
            window.myAPI.sendFuel('red'); 
          }
        });
      }
    } catch (err) {
      console.error("Hardware connection failure:", err);
      setIsSerialConnected(false);
    }
  };

  const handleConnectHardware2 = async () => {
    if (chosenPortIndex2 === "") return;
    
    try {
      const selectedPortIndexNum = parseInt(chosenPortIndex2, 10);
      const targetPort = systemPorts[selectedPortIndexNum];

      await targetPort.open({ baudRate: 115200 });
      setIsSerialConnected2(true);
      console.log("Connected!");

      const decoder = new TextDecoder();
      const reader = targetPort.readable.getReader();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        lines.forEach(line => {
          if (line.trim() === 'EVT:BALL') {
            window.myAPI.sendFuel('blue'); 
          }
        });
      }
    } catch (err) {
      console.error("Hardware connection failure:", err);
      setIsSerialConnected2(false);
    }
  };

  const handleDevices = useCallback(
    (mediaDevices: MediaDeviceInfo[]) => {
      const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    },
    [selectedDeviceId]
  );

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(() => navigator.mediaDevices.enumerateDevices())
      .then(handleDevices)
      .catch(err => console.error("Error accessing media devices:", err));
  }, [handleDevices]);

  useEffect(() => {
    const close = window.myAPI.onInstanceClosed((deadId: number) => {
      setOpenedScreens(prev => prev.filter(screen => screen.id !== deadId));
    });
    return () => close();
  }, []);

  useEffect(() => {
    const syncActiveWindows = async () => {
      const liveScreens = await window.myAPI.getActiveScreens();
      setOpenedScreens(liveScreens);
    };
    syncActiveWindows();
  }, []);

  const spawnNewScreenWindow = async () => {
    const newScreenObject = await window.myAPI.loadScreenWindow(); 
    setOpenedScreens(prev => [...prev, newScreenObject]);
  };

  const pushCameraToWindow = (windowId: number, deviceIdStr: string) => {
    window.myAPI.updateInstanceCamera(windowId, deviceIdStr);
  };

  const sendMirrorToggle = (windowId: number) => {
    window.myAPI.toggleInstanceMirror(windowId);
  };

  const sendColorMirrorToggle = (windowId: number) => {
    window.myAPI.toggleInstanceColorMirror(windowId);
  };

  return (
    <div>
      <h1>Match Runner Dashboard</h1>
      
      <div>
        <h3>Field Peripherals</h3>

        <div>
          <label htmlFor="serial-device-picker">Select Red Hub Port: </label>
          <select 
            onClick={() => scanHardwarePorts()}
            id="serial-device-picker" 
            value={chosenPortIndex}
            onChange={(e) => setChosenPortIndex(e.target.value)}
            disabled={isSerialConnected}
          >
            <option value="">-- Choose Hardware Target --</option>
            {systemPorts.map((port, index) => {
              const info = port.getInfo();
              return (
                <option key={index} value={index}>
                  {`Serial Device ${index + 1} (ID: ${info.usbVendorId || 'Unknown'})`}
                </option>
              );
            })}
          </select>
          <button 
          onClick={handleConnectHardware} 
          disabled={isSerialConnected || chosenPortIndex === ""}
        >
          {isSerialConnected ? "Hardware Connected" : "Connect Chosen Sensor"}
        </button>

          <label htmlFor="serial-device-picker">Select Blue Hub Port: </label>
          <select 
            onClick={() => scanHardwarePorts()}
            id="serial-device-picker" 
            value={chosenPortIndex2}
            onChange={(e) => setChosenPortIndex2(e.target.value)}
            disabled={isSerialConnected2}
          >
            <option value="">-- Choose Hardware Target --</option>
            {systemPorts.map((port, index) => {
              const info = port.getInfo();
              return (
                <option key={index} value={index}>
                  {`Serial Device ${index + 1} (ID: ${info.usbVendorId || 'Unknown'})`}
                </option>
              );
            })}
          </select>
        </div>

        <button 
          onClick={handleConnectHardware2} 
          disabled={isSerialConnected2 || chosenPortIndex2 === ""}
        >
          {isSerialConnected2 ? "Hardware Connected" : "Connect Chosen Sensor"}
        </button>
      </div>

      <button onClick={spawnNewScreenWindow}>
        Spawn New Screen Window
      </button>

      <h2>Active Control Grid ({openedScreens.length})</h2>
      {openedScreens.length === 0 ? (
        <p>No active display windows found.</p>
      ) : (
        <div>
          {openedScreens.map((screen) => (
            <div key={screen.id}>
              <h3>{screen.name}</h3>
              
              <div>
                <div>
                  <label htmlFor={`cam-select-${screen.id}`}>Assign Camera: </label>
                  <select 
                    id={`cam-select-${screen.id}`}
                    onChange={(e) => pushCameraToWindow(screen.id, e.target.value)}
                  >
                    <option value="">-- Select Camera --</option>
                    {devices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.substring(0, 5)}...`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <button onClick={() => sendMirrorToggle(screen.id)}>Toggle Mirror</button>
                  <button onClick={() => sendColorMirrorToggle(screen.id)}>Toggle Color Filter</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Match;