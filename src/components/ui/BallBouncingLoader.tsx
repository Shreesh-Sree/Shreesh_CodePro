
export default function BallBouncingLoader() {
    return (
        <div className="relative h-[100px] w-[75px]">
            {/* Bars */}
            <div className="animate-barUp1 absolute bottom-0 left-0 h-1/2 w-[10px] origin-bottom bg-violet-500 shadow-[1px_1px_0_rgba(0,0,0,0.2)]"></div>
            <div className="animate-barUp2 absolute bottom-0 left-[15px] h-1/2 w-[10px] origin-bottom bg-violet-500 shadow-[1px_1px_0_rgba(0,0,0,0.2)]"></div>
            <div className="animate-barUp3 absolute bottom-0 left-[30px] h-1/2 w-[10px] origin-bottom bg-violet-500 shadow-[1px_1px_0_rgba(0,0,0,0.2)]"></div>
            <div className="animate-barUp4 absolute bottom-0 left-[45px] h-1/2 w-[10px] origin-bottom bg-violet-500 shadow-[1px_1px_0_rgba(0,0,0,0.2)]"></div>
            <div className="animate-barUp5 absolute bottom-0 left-[60px] h-1/2 w-[10px] origin-bottom bg-violet-500 shadow-[1px_1px_0_rgba(0,0,0,0.2)]"></div>
            {/* Ball */}
            <div className="animate-ball absolute bottom-[10px] left-0 h-[10px] w-[10px] rounded-full bg-yellow-400"></div>
        </div>
    );
}
