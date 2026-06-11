import { getParentDashboard } from '../src/controllers/parentController';

// Mock Response
const mockResponse = () => {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
};

async function test() {
  const req: any = {
    user: {
      user_id: '55cea3b9-15f5-4afc-9934-3586d6b9e120' // Hailmeariam Temama's user_id
    }
  };
  const res = mockResponse();

  try {
    await getParentDashboard(req, res);
    console.log("Response status code:", res.statusCode || 200);
    console.log("Response body:", JSON.stringify(res.body, null, 2));
  } catch (err) {
    console.error("Error running dashboard test:", err);
  }
}

test();
