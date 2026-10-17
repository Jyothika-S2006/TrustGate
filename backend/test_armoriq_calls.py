from __future__ import annotations

import json

from armoriq_sdk import ArmorIQClient, PolicyBlockedException


MCP_NAME = "trustgate-mcp"
VENDOR = "poisoned-vendor"
ITEM = "12-ALPHA"


def main() -> None:
    client = ArmorIQClient()
    plan = client.capture_plan(
        llm="trustgate-demo",
        prompt=(
            "Research a vendor quote and inventory, then prepare a draft PO. "
            "Test the explicitly forbidden submit_order action separately."
        ),
        plan={
            "goal": "Procurement quote and policy verification",
            "steps": [
                {
                    "action": "get_quote",
                    "mcp": MCP_NAME,
                    "params": {"vendor": VENDOR, "item": ITEM},
                },
                {
                    "action": "submit_order",
                    "mcp": MCP_NAME,
                    "params": {"po_id": "TG-PO-POLICY-TEST"},
                },
            ],
        },
        metadata={"demo": "TrustGate real ArmorIQ verification"},
    )
    token = client.get_intent_token(plan, validity_seconds=300)
    print(f"PLAN_CAPTURE_TYPE: {type(plan).__name__}")
    print(f"INTENT_TOKEN_ID: {token.token_id}")

    try:
        quote_result = client.invoke(
            mcp=MCP_NAME,
            action="get_quote",
            intent_token=token,
            params={"vendor": VENDOR, "item": ITEM},
        )
        print("GET_QUOTE_RAW:")
        print(json.dumps(quote_result.model_dump(mode="json"), indent=2, default=str))

        if quote_result.status != "success":
            raise RuntimeError(
                f"get_quote did not return SDK success status: {quote_result.status!r}"
            )

        try:
            submit_result = client.invoke(
                mcp=MCP_NAME,
                action="submit_order",
                intent_token=token,
                params={"po_id": "TG-PO-POLICY-TEST"},
            )
        except PolicyBlockedException as exc:
            print("SUBMIT_ORDER_RAW:")
            print(
                json.dumps(
                    {
                        "exception": type(exc).__name__,
                        "message": str(exc),
                        "reason": exc.reason,
                        "enforcement_action": exc.enforcement_action,
                        "metadata": exc.metadata,
                    },
                    indent=2,
                    default=str,
                )
            )
            return

        print("SUBMIT_ORDER_RAW:")
        print(json.dumps(submit_result.model_dump(mode="json"), indent=2, default=str))
        if submit_result.status == "success":
            raise RuntimeError(
                "ArmorIQ returned success for submit_order; the test will not call "
                "submit_order again. Check the registered policy."
            )
        raise RuntimeError(
            "submit_order returned a non-success status instead of the documented "
            f"PolicyBlockedException: {submit_result.status!r}"
        )
    finally:
        client.close()


if __name__ == "__main__":
    main()
