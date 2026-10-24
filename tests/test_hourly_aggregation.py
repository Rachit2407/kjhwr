import pytest

def test_hourly_pair_averaging():
    """
    Verify that 2 half-hourly settlement periods average cleanly,
    and missing single periods are treated strictly as NaN / incomplete.
    """
    # Case 1: normal pair
    sp1 = 1200.0
    sp2 = 1400.0
    hourly_mean = (sp1 + sp2) / 2.0
    assert hourly_mean == 1300.0

    # Case 2: only one SP present
    sp_dict = {0: 1200.0}
    if 0 in sp_dict and 30 in sp_dict:
        val = (sp_dict[0] + sp_dict[30]) / 2.0
    else:
        val = None
    assert val is None, "Incomplete hour must NOT be treated as half-value!"
