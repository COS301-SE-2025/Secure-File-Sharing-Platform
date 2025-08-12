## Service Contracts

[Contract Catalogue](#contract-catalogue)
[]()
[]()

# Contract Catalogue

| Contract ID                  | Producer           | Consumer(s)         | Transport                       | Auth           |
| ---------------------------- | ------------------ | ------------------- | ------------------------------- | -------------- |
| UI → API                     | React UI           | Express API         | HTTPS / REST JSON               | JWT (Bearer)   |
| API → FileService            | Express API        | Go FileService      | HTTPS / REST JSON / multipart   | mTLS + API Key | 
| API → KeyService             | Express API        | Python KeyService   | HTTPS / REST JSON               | mTLS + JWT     |
| FileService → API (events)   | Go FileService     | Express API         | HTTP webhook / gRPC (optional)  | HMAC header    |
