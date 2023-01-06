;; use the SIP009 interface (testnet)
;; trait deployed by deployer address from ./settings/Devnet.toml
(impl-trait .nft-trait.nft-trait)

;; define a new NFT. Make sure to replace background
(define-non-fungible-token background uint)

;; define errors
(define-constant err-admin-only (err u100))
(define-constant err-owner-only (err u101))
(define-constant err-invalid-name (err u301))


;; Store the last issues token ID
(define-data-var last-id uint u0)

(define-map token-url { token-id: uint } { url: (string-ascii 256) })
;; this is used if we want for a given attribute value to give a specific url
;; eg. purple background -> ipfs://dasd..
(define-map name-url { name: (string-ascii 30)} { url: (string-ascii 256) })

(map-set name-url  {name: "DarkPurple"} {url: "ipfs://QmSUD8LoZL4ChE1LRmhcACsP1FJCaHuWpW8FXEtedD1rPo/DarkPurple.json"})
(map-set name-url  {name: "Emerald"} {url: "ipfs://QmSUD8LoZL4ChE1LRmhcACsP1FJCaHuWpW8FXEtedD1rPo/Emerald.json"})
(map-set name-url  {name: "Goldie"} {url: "ipfs://QmSUD8LoZL4ChE1LRmhcACsP1FJCaHuWpW8FXEtedD1rPo/Goldie.json"})
(map-set name-url  {name: "Orange"} {url: "ipfs://QmSUD8LoZL4ChE1LRmhcACsP1FJCaHuWpW8FXEtedD1rPo/Orange.json"})
(map-set name-url  {name: "Purple"} {url: "ipfs://QmSUD8LoZL4ChE1LRmhcACsP1FJCaHuWpW8FXEtedD1rPo/Purple.json"})
(map-set name-url  {name: "Sunset"} {url: "ipfs://QmSUD8LoZL4ChE1LRmhcACsP1FJCaHuWpW8FXEtedD1rPo/Sunset.json"})

;; Owner
(define-data-var contract-owner principal tx-sender)
(define-data-var contract-lootbox principal .lootbox-background)

;; SIP009: Transfer token to a specified principal
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    (asserts! (is-eq tx-sender sender) err-owner-only)
    (nft-transfer? background token-id sender recipient)
  )
)

(define-public (transfer-memo (token-id uint) (sender principal) (recipient principal) (memo (buff 34)))
  (begin 
    (try! (transfer token-id sender recipient))
    (print memo)
    (ok true)
  )
)

;; SIP009: Get the owner of the specified token ID
(define-read-only (get-owner (token-id uint))
  ;; Make sure to replace background
  (ok (nft-get-owner? background token-id))
)

;; SIP009: Get the last token ID
(define-read-only (get-last-token-id)
  (ok (var-get last-id))
)

(define-read-only (get-token-uri (token-id uint)) 
  (let ((token-urr (get url (map-get? token-url {token-id: token-id})))) 
  (ok token-urr)
  )
)

;; Internal - Mint new NFT
(define-private (mint (new-owner principal))
  (begin 
    (asserts! 
      (or
        (is-eq tx-sender (var-get contract-owner)) 
        (is-eq tx-sender (var-get contract-lootbox))) 
      err-admin-only)
    (let 
      ((next-id (+ u1 (var-get last-id))))
      (var-set last-id next-id)
      (nft-mint? background next-id new-owner)
    )
  )
)

(define-public (mint-url (address principal) (url (string-ascii 256)))
  (begin     
    (asserts! 
      (or
        (is-eq tx-sender (var-get contract-owner)) 
        (is-eq tx-sender (var-get contract-lootbox))) 
      err-admin-only)
    (let 
      ((next-id (+ u1 (var-get last-id))))
      (map-set token-url {token-id: next-id} {url: url})
      (var-set last-id next-id)
      (nft-mint? background next-id address)
    )
  )
)

(define-public (mint-name (address principal) (name (string-ascii 30)))
  (begin
    (asserts! 
      (or
        (is-eq tx-sender (var-get contract-owner)) 
        (is-eq tx-sender (var-get contract-lootbox))) 
      err-admin-only)
    (let 
    ;; define and assign: next-id and url
      (
        (next-id (+ u1 (var-get last-id)))
        (url (get url (map-get? name-url {name: name})))
      )
      (if (is-none url)
        err-invalid-name
        (begin 
          (map-set token-url {token-id: next-id} {url: (unwrap-panic url)})
          (var-set last-id next-id)
          (nft-mint? background next-id address)
        )
      )
    )
  )
)

;; Burn a token
(define-public (burn-token (token-id uint))  
	(begin     
		(asserts! (is-eq (some tx-sender) (nft-get-owner? background token-id) ) err-owner-only)     
		(nft-burn? background token-id tx-sender)
  )
)

(define-read-only (get-name-url (name (string-ascii 30)))
  (let ((token-urr (get url (map-get? name-url {name: name})))) 
    (ok token-urr)
  )
)

(define-public (set-name-url (name (string-ascii 30)) (url (string-ascii 30))) 
  (begin
    (asserts! 
      (or
        (is-eq tx-sender (var-get contract-owner)) 
        (is-eq tx-sender (var-get contract-lootbox))) 
      err-admin-only)
    (ok (map-set name-url {name: name} {url: url}))
  )
)

(define-public (remove-name-url (name (string-ascii 30))) 
  (begin
  (asserts! 
      (or
        (is-eq tx-sender (var-get contract-owner)) 
        (is-eq tx-sender (var-get contract-lootbox))) 
      err-admin-only)
    (ok (map-delete name-url {name: name}))
  )
)

;; (mint-name 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 "DarkPurple")
;; (mint-name 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 "DarkPurple")
;; (mint-name 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 "Goldie")
;; (mint-name 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 "Purple")
;; (mint-name 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5 "Sunset")
