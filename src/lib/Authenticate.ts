import type FastDB from "./FastDB";

type AuthenticateStoreParams = {
    jid: string;
    name: string;
    age: number;
}

export default class Authenticate {
    private db: FastDB;
    private users: any[];

    constructor() {
        this.db = global.db;
        this.users = this.db.get("users")?.length ? this.db.get("users") : [];
    }

    
    public store ({ jid, name, age }: AuthenticateStoreParams) {
        this.users.push({ jid, name, age });
        this.db.set("users", this.users);
    }

    public remove (jid: string) {
        this.users.splice(this.users.indexOf(jid), 1);
        this.db.set("users", this.users);
    }

    public check (jid: string): boolean {
        const idx = this.users.findIndex(user => user.jid === jid);

        if (idx > -1) {
            this.remove(jid);
            return true;
        }

        return false;
    }

    public getUser (jid: string) {
        const idx = this.users.findIndex(user => user.jid === jid);

        return this.users[idx] || null;
    }
}