// Opslag voor gegevens die de app zelf maakt (planning, uren, verlofaanvragen, formulieren).
// Testfase: in de browser (localStorage). Livegang: een kleine database in Azure achter een API.
// Modules gebruiken alleen deze interface, zodat de opslag later te vervangen is.

export interface AppStore {
  get<T>(collection: string): Promise<T[]>;
  put<T extends { id: string }>(collection: string, item: T): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
}

const PREFIX = "flexxoapp.store.";

export class LocalStore implements AppStore {
  private read<T>(c: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(PREFIX + c) || "[]") as T[];
    } catch {
      return [];
    }
  }
  private write(c: string, items: unknown[]) {
    try {
      localStorage.setItem(PREFIX + c, JSON.stringify(items));
    } catch {
      /* opslag vol of geblokkeerd */
    }
  }
  async get<T>(c: string) {
    return this.read<T>(c);
  }
  async put<T extends { id: string }>(c: string, item: T) {
    const items = this.read<T>(c).filter((i) => i.id !== item.id);
    this.write(c, [...items, item]);
  }
  async remove(c: string, id: string) {
    this.write(c, this.read<{ id: string }>(c).filter((i) => i.id !== id));
  }
  /** Wist alle testgegevens van de app in deze browser. */
  static clearAll() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith("flexxoapp.")).forEach((k) => localStorage.removeItem(k));
    } catch {
      /* niets */
    }
  }
}

export const store: AppStore = new LocalStore();
