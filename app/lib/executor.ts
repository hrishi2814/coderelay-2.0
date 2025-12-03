import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';
import { decodeDockerStream } from '../utils/dockerHelper';
import {v4 as uuidv4} from 'uuid';
import db from '@/app/lib/db';

const docker = new Docker();

export async function executeCode(code:string,language:string,input:string="") {
    const submissionId = uuidv4();
    const tempDir = path.join(process.cwd(),'temp',submissionId);
    console.log("The language is ",language);
    if(!fs.existsSync(tempDir)){
        fs.mkdirSync(tempDir,{recursive:true});
    }

    fs.writeFileSync(path.join(tempDir,'main.py'),code);
    fs.writeFileSync(path.join(tempDir,'input.txt'),input);


    const container = await docker.createContainer({
        Image: 'python:3.10-alpine',
        Cmd: [
            'sh',
            '-c',
            `python /app/main.py < /app/input.txt`
        ],
        HostConfig: {
            Binds:[
                `${tempDir}:/app:ro`
            ],
            Memory: 100*1024*1024,
            NetworkMode: 'none',
        },
        Tty: false,
    });
    let stdout="";
    let stderr="";
    try {
        await container.start();
        await container.wait();

        const logs = await container.logs({
            stderr:true,
            stdout:true
        })
        const op = logs.toString('utf-8');

        const decoded = decodeDockerStream(logs);
        stdout = decoded.stdout;
        stderr = decoded.stderr;
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
    
    return{stdout,stderr};
}

export async function runSubmission(problemId:string,userCode:string){
    const testCases = db.prepare(
        `SELECT input,expected
        FROM test_cases 
        WHERE problem_id=?`
    ).all(problemId);

    if(testCases.length==0){
        return {success:false, error:"No test cases found!"};
    }

    let passedCt=0;
    const results=[];

    for (const testCase of testCases){
        const{stdout,stderr} = await executeCode(userCode,'python',testCase.input);

        const actual = stdout.trim();
        const expected = testCase.expected.trim();

        const passed =( actual == expected )&& (stderr=="");
        if(passed)passedCt++;

        results.push({
            input: testCase.input,
            expected: expected,
            actual: actual,
            passed: passed,
            error: stderr
        })

    }
    // 4. Final Score
    const score = Math.round((passedCt / testCases.length) * 100);

    return {
        success: true,
        score,
        totalTests: testCases.length,
        passedTests: passedCt,
        details: results 
    };

}