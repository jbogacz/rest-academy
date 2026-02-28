export class Store<T extends { id: string }> {
  private data = new Map<string, T>();

  getAll(): T[] {
    return Array.from(this.data.values());
  }

  getById(id: string): T | undefined {
    return this.data.get(id);
  }

  create(item: T): T {
    this.data.set(item.id, item);
    return item;
  }

  update(id: string, item: T): T {
    this.data.set(id, item);
    return item;
  }

  delete(id: string): boolean {
    return this.data.delete(id);
  }

  exists(id: string): boolean {
    return this.data.has(id);
  }

  count(): number {
    return this.data.size;
  }

  filter(predicate: (item: T) => boolean): T[] {
    return this.getAll().filter(predicate);
  }

  clear(): void {
    this.data.clear();
  }
}

export class KeyValueStore<T> {
  private data = new Map<string, T>();

  get(key: string): T | undefined {
    return this.data.get(key);
  }

  set(key: string, value: T): void {
    this.data.set(key, value);
  }

  getAll(): Map<string, T> {
    return new Map(this.data);
  }

  values(): T[] {
    return Array.from(this.data.values());
  }

  has(key: string): boolean {
    return this.data.has(key);
  }

  delete(key: string): boolean {
    return this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }

  count(): number {
    return this.data.size;
  }
}
