import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Khởi tạo server
const server = new McpServer({
  name: "demo-server",
  version: "1.0.0",
});

// Đăng ký một tool đơn giản
server.tool(
  "hello",
  "Gửi lời chào đến người dùng",
  { name: z.string().describe("Tên của bạn") },
  async ({ name }) => {
    return {
      content: [{ type: "text", text: `Xin chào, ${name}! Đây là ví dụ về MCP server.` }],
    };
  }
);

// Kết nối qua stdio
const transport = new StdioServerTransport();
await server.connect(transport);