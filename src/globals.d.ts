export { }

declare global {
  class GlslCanvas {
    constructor(canvas: HTMLCanvasElement)

    load(fragSource: string): void
    load(fragSource: string, vertSource: string): void

    setUniform(name: string, ...values: any[]): void
    resize(): void
    destroy(): void
  }
}

declare global {
  interface Navigator {
    serial: Serial
  }

  interface Serial {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>
    getPorts(): Promise<SerialPort[]>
  }

  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[]
  }

  interface SerialPortFilter {
    usbVendorId?: number
    usbProductId?: number
  }

  interface SerialPort {
    open(options: SerialOptions): Promise<void>
    close(): Promise<void>
    readable?: ReadableStream<Uint8Array>
    writable?: WritableStream<Uint8Array>
  }

  interface SerialOptions {
    baudRate: number
    dataBits?: 7 | 8
    stopBits?: 1 | 2
    parity?: "none" | "even" | "odd"
    bufferSize?: number
    flowControl?: "none" | "hardware"
  }
}

