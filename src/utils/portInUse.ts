import { createServer } from "net";
export default (port: number) =>
    new Promise<boolean>((res) => {
        const server = createServer((socket) => {
            socket.write("Echo server\r\n");
            socket.pipe(socket);
        });

        server.on("error", () => {
            res(true);
        });
        server.on("listening", () => {
            server.close();
            res(false);
        });

        server.listen(port);
    });
