import Pact from "pact-lang-api";
import { useCallback } from "react";
import { useContext, useState, useEffect } from "react";
import { PactContext } from "../../wallet/pact-wallet";
import { GameContext } from "./game-context";

const KITTY_KADS_CONTRACT = "kitty-kad-kitties";
const ADOPT_FUNC = "adopt-gen-0s-bulk";
const OWNED_BY_FUNC = "kitties-owned-by";
const ALL_IDS_FUNC = "all-kitties";
const ALL_ON_SALE_FUNCTION = "get-all-on-sale";
const MARKET_PLACE_FIELDS_FOR_ID = "get-marketplace-fields-for-id";
const MARKET_PLACE_FIELDS_FOR_IDS = "get-marketplace-fields-for-ids";
const NFT_FIELDS_FOR_ID = "get-nft-fields-for-id";

// const WL_ROLE_FUNC = "enforce-adopt-wl-role";
// export const ADMIN_ADDRESS =
//   "k:fd91af358418e2c8e50a501451a41de49af01f45e34bc4f1735cab293084f7ea";
export const ADMIN_ADDRESS =
  "k:f7278eeaa55a4b52c281fa694035f82a43a6711eb547fc1ab900be1ccf9fb409";

function useGetMyKitties() {
  const { account, readFromContract, defaultMeta } = useContext(PactContext);

  const [getMyKitties] = useState(() => async () => {
    const pactCode = `(free.${KITTY_KADS_CONTRACT}.${OWNED_BY_FUNC} "${account.account}")`;
    const meta = defaultMeta(1000000);
    return await readFromContract({ pactCode, meta });
  });
  return getMyKitties;
}

function useGetAllKitties() {
  const { readFromContract, defaultMeta } = useContext(PactContext);

  const [getAllKitties] = useState(() => async () => {
    const pactCode = `(free.${KITTY_KADS_CONTRACT}.${ALL_IDS_FUNC})`;
    const meta = defaultMeta();
    return await readFromContract({ pactCode, meta });
  });
  return getAllKitties;
}

function useGetKittiesOnSale() {
  const { readFromContract, defaultMeta } = useContext(PactContext);
  const getAllOnSale = useCallback(async () => {
    const pactCode = `(free.${KITTY_KADS_CONTRACT}.${ALL_ON_SALE_FUNCTION})`;
    const meta = defaultMeta();
    return await readFromContract({ pactCode, meta });
  }, [defaultMeta, readFromContract]);
  return getAllOnSale;
}

function useGetPricesForKitties() {
  const { readFromContract, defaultMeta } = useContext(PactContext);
  const getPricesForKitties = useCallback(
    async (ids) => {
      const pactCode = `(free.${KITTY_KADS_CONTRACT}.${MARKET_PLACE_FIELDS_FOR_IDS} ["price"] ${JSON.stringify(
        ids
      )})`;
      const meta = defaultMeta();
      return await readFromContract({ pactCode, meta });
    },
    [defaultMeta, readFromContract]
  );
  return getPricesForKitties;
}

function useGetKittyActions() {
  const { readFromContract, defaultMeta } = useContext(PactContext);
  const getAllOnSale = useCallback(
    async (id) => {
      const pactCodeNft = `(free.${KITTY_KADS_CONTRACT}.${NFT_FIELDS_FOR_ID} ["owner"] "${id}")`;
      const pactCodeMarket = `(free.${KITTY_KADS_CONTRACT}.${MARKET_PLACE_FIELDS_FOR_ID} ["for-sale", "owner", "price"] "${id}")`;

      const meta = defaultMeta();
      const [nftData, marketData] = await Promise.all([
        readFromContract({ pactCode: pactCodeNft, meta }),
        readFromContract({ pactCode: pactCodeMarket, meta }, null, true),
      ]);
      return { nftData, marketData };
    },
    [defaultMeta, readFromContract]
  );
  return getAllOnSale;
}

function useAdoptKitties() {
  const { account, gasPrice, chainId, netId, sendTransaction } =
    useContext(PactContext);
  const { pricePerKitty } = useContext(GameContext);
  return (amount, callback) => {
    const priceToPay = amount * pricePerKitty;
    const kittyKadsAmount = `${amount} Kitty Kad${amount === 1 ? "" : "s"}`;
    const pactCode = `(free.${KITTY_KADS_CONTRACT}.${ADOPT_FUNC} "${account.account}" ${amount})`;
    const cmd = {
      pactCode,
      caps: [
        Pact.lang.mkCap(`Pay to adopt`, "Pay to adopt", `coin.TRANSFER`, [
          account.account,
          ADMIN_ADDRESS,
          priceToPay,
        ]),
        Pact.lang.mkCap(
          "Verify your account",
          "Verify your account",
          `free.${KITTY_KADS_CONTRACT}.ACCOUNT_GUARD`,
          [account.account]
        ),
        Pact.lang.mkCap("Gas capability", "Pay gas", "coin.GAS", []),
      ],
      sender: account.account,
      gasLimit: 3000 * amount,
      gasPrice,
      chainId,
      ttl: 600,
      envData: {
        "user-ks": account.guard,
        account: account.account,
      },
      signingPubKey: account.guard.keys[0],
      networkId: netId,
    };
    const previewContent = (
      <p>
        You will adopt {kittyKadsAmount} for {priceToPay} KDA
      </p>
    );
    sendTransaction(
      cmd,
      previewContent,
      `adopting ${kittyKadsAmount}`,
      callback ?? (() => alert("adopted!"))
    );
  };
}

function useAmountLeftToAdopt() {
  const { readFromContract, defaultMeta } = useContext(PactContext);
  const [amountLeftToAdopt, setAmountLeftToAdopt] = useState(null);
  useEffect(() => {
    const fetch = async () => {
      const pactCode = `( -    
      (free.${KITTY_KADS_CONTRACT}.get-count "kitties-created-to-adopt-count-key")
      (free.${KITTY_KADS_CONTRACT}.get-count "kitties-adopted-count-key")
    )`;
      const meta = defaultMeta();
      const left = await readFromContract({ pactCode, meta }, true);
      setAmountLeftToAdopt(left);
    };
    fetch();
  }, []);

  return amountLeftToAdopt;
}

export {
  useGetMyKitties,
  useGetAllKitties,
  useAdoptKitties,
  useAmountLeftToAdopt,
  useGetKittiesOnSale,
  useGetKittyActions,
  useGetPricesForKitties,
};
