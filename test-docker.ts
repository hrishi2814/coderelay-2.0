import Docker from 'dockerode';
import { decodeDockerStream } from './app/utils/dockerHelper';
import fs from 'fs';
import path from 'path';

const docker = new Docker();
async function main(){

    //1 create a temp dir
    const tempDir = path.join(process.cwd(),'temp','submission-abc');

    //2 create folder recursively
    if(!fs.existsSync(tempDir)){
        fs.mkdirSync(tempDir,{recursive:true});
    }

    //3 write the file
    const userCode = `
def solve():
    print("This is a multi-line string!")
    print("It handles 'quotes' perfectly.")

solve()` ;

    fs.writeFileSync(path.join(tempDir,'main.py'),userCode);

    const container = await docker.createContainer(
        {
            Image: 'python:3.10-alpine',
            Cmd: ['python', '/app/main.py'],
            HostConfig: {
                Binds: [
                    `${tempDir}:/app:ro`
                ],
                Memory: 100*1024*1024,
                NetworkMode: 'none',
            },
            Tty: false, //apparently critical to separate stdout and stderrr
        }
    );

    try{
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
    }catch(error){
        console.log("Error: ",error);
    }finally {
    // 5. CLEANUP! (Very Important)
    // If you don't do this, you will fill your hard drive with dead containers.
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

main();