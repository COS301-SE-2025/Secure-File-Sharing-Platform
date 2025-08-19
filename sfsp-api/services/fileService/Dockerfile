FROM golang:1.23.0-alpine AS build

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o main

FROM alpine:latest

WORKDIR /root/

COPY --from=build /app/main .

COPY --from=build /app/.env .

EXPOSE 8081

CMD ["./main"]