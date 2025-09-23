/* "use-client"
import React, { useState } from "react";
import SignatureCanvas from 'react-signature-canvas';

function SignaturePad(){
    const [sign,setSign] = useState()
    const [url,setUrl] = useState()

    const handleClear= () =>{
        sign.clear()
        setUrl('')
    }
    const handleGenerate= () =>{
        setUrl(sign.getTrimmedCanvas().toDataURL('image/png'))
    }

    return(
        <div>
            <div style={{border:"2px solid black",width: 500, height: 200}}>
                <SignatureCanvas 
                    canvasProps={{width: 500, height: 200, className: 'signature-pad'}}
                    ref={data=>setSign(data)}
                />
            </div>

            <br></br>
            <button style={{height:"30px",width:"60px"}} onClick={handleClear}>Clear</button>
            <button  style={{height:"30px",width:"60px"}} onClick={handleGenerate}>Save</button>

            <br/><br/>
            <img src={url} />
        </div>
    )
}
export default SignaturePad;

*/


import React, { useState, forwardRef, useImperativeHandle, useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

const SignaturePad = forwardRef(({ file }, ref) => {
  const sigRef = useRef(null);
  const [url, setUrl] = useState("");

  const handleClear = () => {
    sigRef.current.clear();
    setUrl("");
  };

  const handleGenerate = () => {
    if (!sigRef.current.isEmpty()) {
      setUrl(sigRef.current.getTrimmedCanvas().toDataURL("image/png"));
    }
  };

  // 👇 Expose functions to parent through ref
  useImperativeHandle(ref, () => ({
    clear: handleClear,
    generate: handleGenerate,
    prepare: () => {
      if (sigRef.current) {
        sigRef.current.clear();
        console.log("Ready to sign for file:", file);
      }
    }
  }));

  return (
    <div>
      <div style={{ border: "2px solid black", width: 500, height: 200 }}>
        <SignatureCanvas
          ref={sigRef}
          canvasProps={{ width: 500, height: 200, className: "signature-pad" }}
        />
      </div>

      <br />
      <button onClick={handleClear}>Clear</button>
      <button onClick={handleGenerate}>Save</button>

      <br /><br />
      {url && <img src={url} alt="signature preview" />}
    </div>
  );
});

export default SignaturePad;
