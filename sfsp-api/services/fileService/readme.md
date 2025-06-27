//for the file upload

{
    "fileName" : "Algorithmic trading.pdf",
    "fileType" : "application/pdf",
    "userId" : "550e8400-e29b-41d4-a716-446655440000",
    "nonce" : "random-nonce",
    "fileDescription" : "This is a test file",
    "fileTags": ["Demo"],
    "path" : "files",
    "fileContent" : "qwifuhqoifbq3i4bfoiuweabfkljswerbivaebvqwK" //base 64 encoded content

}

//it returns
{"fileId":"b334b3cc-d7fd-445f-9aeb-7f865f88896b","message":"File uploaded and metadata stored"}

//download file

{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "fileId": "b334b3cc-d7fd-445f-9aeb-7f865f88896b"
}

//it returns
{"fileName":"Algorithmic trading.pdf","fileContent":"c29tZSBlbmNvZGVkIGNvbnRlbnQ="}

//get all the metadata of files uploaded by a user

{
	"userId": "550e8400-e29b-41d4-a716-446655440000"
}

//returns
[
	{
		"fileId": "b334b3cc-d7fd-445f-9aeb-7f865f88896b",
		"fileName": "Algorithmic trading.pdf",
		"fileType": "application/pdf",
		"fileDescription": "This is a test file",
		"fileTags": ["Demo"],
		"uploadDate": "2023-10-01T12:00:00Z"
	},
	// ... other files
]

//get file metadata
{
	"userId": "550e8400-e29b-41d4-a716-446655440000",
	"fileId": "b334b3cc-d7fd-445f-9aeb-7f865f88896b"
}

//returns
{
	"fileId": "b334b3cc-d7fd-445f-9aeb-7f865f88896b",
	"fileName": "Algorithmic trading.pdf",
	"fileType": "application/pdf",
	"fileDescription": "This is a test file",
	"fileTags": ["Demo"],
	"uploadDate": "2023-10-01T12:00:00Z"
}

//You should verify that the file belongs to sender_id before allowing the insert (either via query or foreign key constraints).

//Optionally, check that the recipient exists in the users table.
//code wise I mean you can check that the user exists in the users table before allowing the insert.

## Metadata
recipient_id: "bob-uuid", //this file was sent by bob and recieved by alice
      encrypted_file_key: "<base64>", // Encrypted with shared X3DH key
      x3dh_ephemeral_pubkey: "...",
      ik_pub: "...",
      opk_id: "opk-7",

//when a user sends a file to another user
{
  "senderId": "b4d6c1e9-1a9a-4e28-bc5d-2c3fa2cfe59a",
  "recipientId": "e3c29cb2-47d2-4d75-a88b-fdc920144f0e",
  "fileId": "7f98cc80-34c2-42b3-9f58-f6c7a385a244",
  "metadata": {
    "fileName": "contract.pdf",
	"EK_public": "iwubfq3bhfrqwuobfvoqwrbf"
	"Ik_public": "efbqwurbfou3wrbfwkur"
	"Encrypted_file_key": "liuefboqiuwbrqreoicbqlr"
    "description": "Shared NDA document",
    "tags": ["legal", "confidential"]
  }
}

//accepted is false by default

//output should be

```
{ JSON
  "message": "File shared with recipient"
}
```
add tags

request
{
  "fileId": "0a40aa68-46d8-464a-a9cd-58ec1b45ba46",
  "tags": ["urgent", "legal", "confidential"]
}

response
{"message":"Tags added successfully"}