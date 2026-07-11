class GlobalStorageBox {

  private data = new Map<string, any>();

  set(name: string, value: any) {
    this.data.set(name, value);
  }

  get(name: string): any {
    return this.data.get(name);
  }

  has(name: string): boolean {
    return this.data.has(name);
  }

  remove(name: string) {
    this.data.delete(name);
  }
}

export const storageBox = new GlobalStorageBox();