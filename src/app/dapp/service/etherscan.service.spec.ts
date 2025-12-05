import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { EtherscanService } from './etherscan.service';

describe('EtherscanService', () => {
  let service: EtherscanService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [EtherscanService]
    });
    service = TestBed.inject(EtherscanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch address transactions', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockNetwork = 'ETH Mainnet';
    const mockResponse = {
      status: '1',
      message: 'OK',
      result: [
        {
          hash: '0xabc123',
          from: '0x123...',
          to: '0x456...',
          value: '1000000000000000000', // 1 ETH in wei
          timeStamp: '1620000000',
          gasUsed: '21000',
          gasPrice: '20000000000',
          isError: '0',
          txreceipt_status: '1'
        }
      ]
    };

    service.getAddressTransactions(mockAddress, mockNetwork).subscribe(transactions => {
      expect(transactions.length).toBe(1);
      expect(transactions[0].hash).toBe('0xabc123');
      expect(transactions[0].amount).toBe('1');
    });

    const req = httpMock.expectOne(
      `https://api.etherscan.io/api?module=account&action=txlist&address=${mockAddress}&startblock=0&endblock=99999999&sort=desc&apikey=G1T6IKKGZRF4BMPXA4JEQ775TN65ARKNRN`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch token transfers', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';
    const mockNetwork = 'ETH Mainnet';
    const mockResponse = {
      status: '1',
      message: 'OK',
      result: [
        {
          hash: '0xdef456',
          from: '0x123...',
          to: '0x456...',
          value: '1000000', // 1 token with 6 decimals
          timeStamp: '1620000000',
          tokenDecimal: '6',
          tokenName: 'Test Token',
          tokenSymbol: 'TST',
          contractAddress: '0xcontract...'
        }
      ]
    };

    service.getAddressTokenTransfers(mockAddress, mockNetwork).subscribe(transactions => {
      expect(transactions.length).toBe(1);
      expect(transactions[0].hash).toBe('0xdef456');
      expect(transactions[0].amount).toBe('1');
      expect(transactions[0].tokenSymbol).toBe('TST');
    });

    const req = httpMock.expectOne(
      `https://api.etherscan.io/api?module=account&action=tokentx&address=${mockAddress}&sort=desc&apikey=G1T6IKKGZRF4BMPXA4JEQ775TN65ARKNRN`
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});