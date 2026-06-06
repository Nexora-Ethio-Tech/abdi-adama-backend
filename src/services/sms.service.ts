import axios from 'axios';

function htmlEscape(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getCurrentDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export class SMSService {
    private readonly baseUrl: string;

    constructor(baseUrl: string = 'http://192.168.8.1') {
        this.baseUrl = baseUrl;
    }

    /** Fetches the required authentication token from Huawei modem (XML response) */
    private async getToken(): Promise<string | null> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/webserver/token`, { timeout: 5000 });
            
            if (response.status === 200 && typeof response.data === 'string') {
                // Parse XML response to extract <token> element
                const match = response.data.match(/<token>(.*?)<\/token>/);
                if (match && match[1]) {
                    const token = match[1].trim();
                    console.log(`[SMS] Token obtained: ${token.substring(0, 10)}...`);
                    return token;
                }
                console.error('[SMS] No token found in response:', response.data.substring(0, 100));
            }
            return null;
        } catch (err) {
            console.error(`[SMS] Error connecting to Huawei Modem at ${this.baseUrl}: ${err}`);
            return null;
        }
    }

    /** Sends SMS via Huawei modem */
    public async sendSMS(phone: string, message: string): Promise<boolean> {
        const token = await this.getToken();
        if (!token) {
            console.error(`[SMS] Failed to obtain token for phone: ${phone}`);
            return false;
        }

        const url = `${this.baseUrl}/api/sms/send-sms`;
        
        // Match Python app.py payload structure and encoding
        const payload = `<?xml version="1.0" encoding="UTF-8"?>
<request>
    <Index>-1</Index>
    <Phones>
        <Phone>${phone}</Phone>
    </Phones>
    <Sca></Sca>
    <Content>${htmlEscape(message)}</Content>
    <Length>${message.length}</Length>
    <Reserved>1</Reserved>
    <Date>${getCurrentDateTime()}</Date>
</request>`;

        try {
            console.log(`[SMS] Sending to ${phone}: ${message.substring(0, 50)}...`);
            
            const res = await axios.post(url, payload, {
                timeout: 10000,  // Increased timeout like Python version
                headers: {
                    '__RequestVerificationToken': token,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                },
            });

            console.log(`[SMS RESPONSE] Status: ${res.status}`);
            console.log(`[SMS RESPONSE] Body: ${res.data.substring(0, 200)}`);

            // Check both response formats (like Python app.py does)
            const responseText = String(res.data);
            if (responseText.includes('OK') || responseText.includes('<response>OK</response>')) {
                console.log(`[SMS] ✓ Successfully sent to ${phone}`);
                return true;
            }

            console.warn(`[SMS] ✗ Modem returned non-OK response for ${phone}`);
            return false;
        } catch (err) {
            console.error(`[SMS] ✗ Failed to transmit to ${phone}: ${err}`);
            return false;
        }
    }
}

export const smsService = new SMSService();
