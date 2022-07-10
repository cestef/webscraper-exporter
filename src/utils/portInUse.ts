import { createServer } from "net";
export const portInUse = (port: number) =>
    new Promise<boolean>((res) => {
        const server = createServer((socket) => {
            socket.write("Echo server\r\n");
            socket.pipe(socket);
        });

        server.on("error", () => {
            res(true);
        });
        server.on("listening", () => {
            server.removeAllListeners();
            server.close();
            res(false);
        });

        server.listen(port);
    });
