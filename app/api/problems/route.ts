import { NextResponse } from "next/server"

export async function GET(){

    return NextResponse.json({
        data:[
            {id:1,title:"Two sum",difficulty:"Easy"},
            {id:2,title:"reverse linked list",difficulty:"Medium"}
        ]
    });
}