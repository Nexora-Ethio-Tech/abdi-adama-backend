import axios from 'axios';

export class SMSService {
    private readonly baseUrl: string;

    constructor(baseUrl: string = 'http://192.168.8.1') {
        this.baseUrl = baseUrl;
    }

    /** 1. Fetches the required authentication token */
    private async getToken(): Promise<string | null> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/webserver/token`, { timeout: 5000 });
            return response.status === 200 ? String(response.data).trim() : null;
        } catch (err) {
            console.error(`Error connecting to Huawei Modem: ${err}`);
            return null;
        }
    }

    /** 2. The core function you need: Takes phone & message, returns success status */
    public async sendSMS(phone: string, message: string): Promise<boolean> {
        const token = await this.getToken();
        if (!token) return false;

        const url = `${this.baseUrl}/api/sms/send-sms`;
        const payload = `<?xml version='1.0' encoding='UTF-8'?>
        <request>
            <Index>-1</Index>
            <Phones><Phone>${phone}</Phone></Phones>
            <Sca></Sca>
            <Content>${message}</Content>
            <Length>${message.length}</Length>
            <Reserved>1</Reserved>
            <Date>-1</Date>
        </request>`;

        try {
            const res = await axios.post<string>(url, payload, {
                timeout: 5000,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    '__RequestVerificationToken': token,
                    'Content-Type': 'application/xml',
                },
            });

            return typeof res.data === 'string' && res.data.includes('OK');
        } catch (err) {
            console.error(`Failed to transmit SMS: ${err}`);
            return false;
        }
    }
}

export const smsService = new SMSService();
