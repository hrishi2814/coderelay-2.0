import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';
import { decodeDockerStream } from '../utils/dockerHelper';
import {v4 as uuidv4} from 'uuid';

const docker = new Docker();

export async function executeCode(code:string) {
    const submissionId = uuidv4();
    const tempDir = path.join(process.cwd(),'temp',submissionId);

    if(!fs.existsSync(tempDir)){
        fs.mkdirSync(tempDir,{recursive:true});
    }

    fs.writeFileSync(path.join(tempDir,'main.py'),code);

    const container = await docker.createContainer({
        Image: 'python:3.10-alpine',
        Cmd: ['python', '/app/main.py'],
        HostConfig: {
            Binds:[
                `${tempDir}:/app:ro`
            ],
            Memory: 100*1024*1024,
            NetworkMode: 'none',
        },
        Tty: false,
    });

    try {
        await container.start();
        await container.wait();

        const logs = await container.logs({
            stderr:true,
            stdout:true
        })
        const op = logs.toString('utf-8');

        const {stdout,stderr} = decodeDockerStream(logs);
        console.log(stdout.trim());
        console.log(stderr.trim());
    } catch (error) {
        console.log(error);
    }finally{
        await container.remove();
        console.log("Cleaned up");

            try {
                fs.rmSync(tempDir,{recursive:true,force:true});
                console.log("Cleaned up code files")
            } catch (error) {
                console.log("error while cleaning up code files:",error);
            }
    }
    
}