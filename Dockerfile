FROM golang:1.26.2-alpine AS builder

WORKDIR /src
ENV GOWORK=off
COPY go.mod go.sum ./
RUN go mod download
COPY cmd/ ./cmd/
COPY internal/ ./internal/
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/zaim-api-mcp ./cmd/zaim-api-mcp

FROM alpine:3.23
RUN apk add --no-cache ca-certificates
COPY --from=builder /out/zaim-api-mcp /usr/local/bin/zaim-api-mcp
USER 65532:65532
ENTRYPOINT ["/usr/local/bin/zaim-api-mcp"]
