import { ensureDB } from "../helpers/db";
import type FastDB from "./FastDB";

type AuthenticateStoreParams = {
    phone: string;
    name: string;
    age: number;
};

export default class Authenticate {
    private db: FastDB;
    private users: Map<string, AuthenticateStoreParams>;

    constructor() {
        this.db = ensureDB();

        const rawUsers = this.db.get("users") || [];
        this.users = new Map(
            rawUsers.map((user: AuthenticateStoreParams) => [user.phone, user])
        );
    }

    public store({ phone, name, age }: AuthenticateStoreParams) {
        this.users.set(phone, { phone, name, age });
        this.syncToDB();
    }

    public remove(phone: string) {
        if (this.users.delete(phone)) {
            this.syncToDB();
        }
    }

    public check(phone: string): boolean {
        let parsePhone = phone.split("@")[0];

        if (this.users.has(parsePhone)) {
            return true;
        }

        return false;
    }

    public getUser(phone: string) {
        return this.users.get(phone) || null;
    }

    private syncToDB() {
        this.db.set("users", Array.from(new Set(this.users.values())));
        this.db.flush();
    }
}
